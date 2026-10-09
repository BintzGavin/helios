/**
 * Quality metrics computed in code for each run's MP4: the flash check, picture sync against the
 * track's ground-truth beats, and the pass/fail verdict.
 *
 * Nothing here trusts a missing number. A metric that could not run is recorded as `ok: null`
 * with a reason, and the verdict counts it as a failure.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------------------
// Picture motion

const MOTION_W = 160;
const MOTION_H = 90;

/**
 * Per-frame picture motion: the mean absolute difference between consecutive frames, read at
 * 160 × 90 grey, in grey levels (0–255). `motion[0]` is 0 (the first frame has nothing before it).
 * Frame times come from the decoder (showinfo), so variable-frame-rate files are timed correctly.
 */
export function frameMotion(file, { maxSeconds = null } = {}) {
  const args = ['-hide_banner', '-nostats', '-v', 'info', '-i', file, '-an', '-sn', '-dn'];
  if (maxSeconds) args.push('-t', String(maxSeconds));
  args.push('-vf', `scale=${MOTION_W}:${MOTION_H}:flags=area,format=gray,showinfo`, '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1');
  const result = spawnSync('ffmpeg', args, { maxBuffer: 1 << 30 });
  if (result.status !== 0) {
    const err = String(result.stderr || result.error || '').trim().split('\n').filter((l) => !l.includes('Parsed_showinfo')).at(-1);
    return { error: `ffmpeg could not decode the video: ${err || `exit ${result.status}`}` };
  }
  const frameSize = MOTION_W * MOTION_H;
  const frames = Math.floor(result.stdout.length / frameSize);
  if (frames < 2) return { error: `the video decoded to ${frames} frame(s)` };

  const stderr = String(result.stderr);
  const times = [];
  for (const m of stderr.matchAll(/\bn:\s*\d+\s+pts:\s*-?\d+\s+pts_time:\s*(-?[\d.]+(?:e[-+]?\d+)?)/g)) times.push(Number(m[1]));
  const rate = stderr.match(/frame_rate:\s*(\d+)\/(\d+)/);
  let fps = rate && Number(rate[2]) ? Number(rate[1]) / Number(rate[2]) : null;
  if (times.length !== frames) {
    // showinfo and the raw output disagree: fall back to a constant rate.
    if (!fps) return { error: 'could not read frame times' };
    times.length = 0;
    for (let i = 0; i < frames; i++) times.push(i / fps);
  }
  if (!fps || !Number.isFinite(fps)) fps = (frames - 1) / (times[frames - 1] - times[0]);

  const buf = result.stdout;
  const motion = new Float64Array(frames);
  for (let f = 1; f < frames; f++) {
    let sum = 0;
    const a = (f - 1) * frameSize;
    const b = f * frameSize;
    for (let p = 0; p < frameSize; p++) sum += Math.abs(buf[b + p] - buf[a + p]);
    motion[f] = sum / frameSize;
  }
  return { fps, times, motion: Array.from(motion), frames };
}

// ---------------------------------------------------------------------------------------
// Sync against the ground-truth beats

/**
 * Thresholds for the sync metric. README.md explains each one.
 * - toleranceSec: a peak counts as on the beat within ±40 ms, or ±1 frame when frames are longer.
 * - peakFloor: a change smaller than half a grey level, averaged over the whole picture, is
 *   encoder noise, not a visible change.
 * - peakSigma: a peak must also stand out from the video's own typical motion: median + 3 × the
 *   robust spread (1.4826 × MAD).
 * - peakRelative: and be at least 30% of the video's strong changes (the 90th percentile of the
 *   candidate peaks), so faint flicker between big hits does not count as a beat.
 * - minScore, minCoverage, minCorr: the pass bar (see README.md).
 */
export const SYNC = {
  toleranceSec: 0.04,
  peakFloor: 0.5,
  peakSigma: 3,
  peakRelative: 0.3,
  minScore: 0.4,
  minCoverage: 0.2,
  minCorr: 0.1,
};

function quantile(values, q) {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return 0;
  const pos = (v.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}

/** Significant picture-change peaks: local maxima of motion that clear the three floors above. */
export function pickPeaks(times, motion, fps, opts = SYNC) {
  const values = motion.slice(1);
  const median = quantile(values, 0.5);
  const mad = quantile(values.map((v) => Math.abs(v - median)), 0.5);
  const floor = Math.max(opts.peakFloor, median + opts.peakSigma * 1.4826 * mad);
  // Local maximum within ±2 frames at 30 fps (≈67 ms): wide enough to merge one change spread
  // over two frames, narrow enough to keep peaks on consecutive beats (≈480 ms apart) apart.
  const w = Math.max(1, Math.round(0.067 * fps));
  const candidates = [];
  for (let i = 1; i < motion.length; i++) {
    if (motion[i] < floor) continue;
    let isMax = true;
    for (let j = Math.max(1, i - w); j <= Math.min(motion.length - 1, i + w) && isMax; j++) {
      if (j < i && motion[j] >= motion[i]) isMax = false; // ties go to the earliest frame
      if (j > i && motion[j] > motion[i]) isMax = false;
    }
    if (isMax) candidates.push({ i, t: times[i], value: motion[i] });
  }
  const strong = quantile(candidates.map((c) => c.value), 0.9);
  const peaks = candidates.filter((c) => c.value >= opts.peakRelative * strong);
  return { peaks, floor, median, mad };
}

function nearest(sorted, x) {
  let lo = 0;
  let hi = sorted.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= x) lo = mid; else hi = mid;
  }
  return Math.abs(sorted[lo] - x) <= Math.abs(sorted[hi] - x) ? lo : hi;
}

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    sab += da * db; saa += da * da; sbb += db * db;
  }
  // A picture that never changes has no variance: it does not correlate with anything.
  return saa > 1e-12 && sbb > 1e-12 ? sab / Math.sqrt(saa * sbb) : 0;
}

/**
 * Scores picture changes against the truth's beats.
 *
 * - score: the share of significant change peaks that land within tolerance of a true beat
 *   (0 when the picture never changes).
 * - coverage: the share of true beats that have such a peak.
 * - corr: Pearson correlation between per-frame motion (minus the noise floor) and a kick impulse
 *   train (1 on the frame nearest each kick), best over lags within the tolerance.
 * - ok: score ≥ minScore, coverage ≥ minCoverage and corr ≥ minCorr.
 */
export function scoreSync(motionData, truth, opts = SYNC) {
  if (!motionData || motionData.error) {
    return { ok: null, score: null, reason: motionData?.error || 'no motion data' };
  }
  if (!truth?.beats?.length) return { ok: null, score: null, reason: 'no ground-truth beats' };
  const { fps } = motionData;
  // Only the part of the video that the song covers counts.
  const end = Math.min(truth.duration, motionData.times.at(-1));
  const keep = motionData.times.findLastIndex((t) => t <= end + 1e-6) + 1;
  const times = motionData.times.slice(0, keep);
  const motion = motionData.motion.slice(0, keep);
  const tolerance = Math.max(opts.toleranceSec, 1 / fps) + 1e-6;
  const beats = truth.beats.filter((b) => b <= end + tolerance);
  if (!beats.length) return { ok: null, score: null, reason: 'the video ends before the first beat' };

  const { peaks, floor } = pickPeaks(times, motion, fps, opts);
  const hitBeats = new Set();
  let onBeat = 0;
  for (const p of peaks) {
    const k = nearest(beats, p.t);
    p.beatOffsetMs = Math.round((p.t - beats[k]) * 1000);
    p.onBeat = Math.abs(p.t - beats[k]) <= tolerance;
    if (p.onBeat) { onBeat++; hitBeats.add(k); }
  }

  const kicks = (truth.onsets?.kick?.length ? truth.onsets.kick : truth.beats).filter((k) => k <= end);
  const train = new Array(times.length).fill(0);
  for (const k of kicks) train[nearest(times, k)] = 1;
  // Encoder noise under the floor is not picture motion; without this a still image's keyframe
  // blips can correlate with the kick by chance.
  const visible = motion.map((m) => Math.max(0, m - opts.peakFloor));
  let corr = -1;
  let lag = 0;
  const maxLag = Math.max(1, Math.round((tolerance - 1e-6) * fps));
  for (let L = -maxLag; L <= maxLag; L++) {
    // motion[i + L] against train[i]: a positive lag means the picture changes a frame late.
    const a = [];
    const b = [];
    for (let i = 1; i < times.length; i++) {
      if (i + L < 1 || i + L >= times.length) continue;
      a.push(visible[i + L]);
      b.push(train[i]);
    }
    const r = pearson(a, b);
    if (r > corr) { corr = r; lag = L; }
  }

  const score = peaks.length ? onBeat / peaks.length : 0;
  const coverage = hitBeats.size / beats.length;
  const round = (x) => Math.round(x * 1000) / 1000;
  const reasons = [];
  if (!peaks.length) reasons.push('no distinct picture changes (motion never peaks above its own baseline)');
  else {
    if (score < opts.minScore) reasons.push(`${onBeat} of ${peaks.length} picture changes land on a beat (score ${round(score)} < ${opts.minScore})`);
    if (coverage < opts.minCoverage) reasons.push(`only ${hitBeats.size} of ${beats.length} beats get a picture change (coverage ${round(coverage)} < ${opts.minCoverage})`);
    if (corr < opts.minCorr) reasons.push(`motion does not follow the kick (r ${round(corr)} < ${opts.minCorr})`);
  }
  return {
    ok: reasons.length === 0,
    score: round(score),
    coverage: round(coverage),
    corr: round(corr),
    lagFrames: lag,
    peaks: peaks.length,
    onBeat,
    beats: beats.length,
    beatsHit: hitBeats.size,
    fps: Math.round(fps * 100) / 100,
    toleranceMs: Math.round(tolerance * 1000),
    peakFloor: round(floor),
    truth: truth.id,
    ...(reasons.length ? { reason: reasons.join('; ') } : {}),
    // Kept out of the scoreboard; written to the run's sync.json for plotting.
    detail: { times: times.map(round), motion: motion.map(round), peaks: peaks.map((p) => ({ t: round(p.t), value: round(p.value), beatOffsetMs: p.beatOffsetMs, onBeat: p.onBeat })) },
  };
}

// ---------------------------------------------------------------------------------------
// Flash: `helios check --json` from this repo's CLI

/**
 * Finds out once whether `node <cli> check` can run. The default CLI entry imports ../dist, so an
 * unbuilt CLI is caught before spawning it.
 */
export function flashTool(cliEntry, { defaultEntry = null } = {}) {
  const entry = path.resolve(cliEntry);
  const label = `node ${entry} check --json`;
  if (!fs.existsSync(entry)) return { available: false, command: label, reason: `no Helios CLI at ${entry}` };
  if (defaultEntry && entry === path.resolve(defaultEntry) && !fs.existsSync(path.join(path.dirname(entry), '..', 'dist', 'index.js'))) {
    return {
      available: false,
      command: label,
      reason: 'the Helios CLI is not built (packages/cli/dist is missing): run `npm run build -w packages/infrastructure && npm run build` at the repo root',
    };
  }
  const probe = spawnSync(process.execPath, [entry, 'check', '--help'], { encoding: 'utf8', timeout: 60_000 });
  if (probe.status !== 0) {
    const why = `${probe.stderr || ''}\n${probe.stdout || ''}`.trim().split('\n').find((l) => l.trim()) || `exit ${probe.status}`;
    return { available: false, command: label, reason: `\`helios check\` is not available in this CLI: ${why.trim().slice(0, 200)}` };
  }
  return { available: true, command: label, entry };
}

/** Runs `helios check --json` on a file and keeps its flash result. */
export function runFlashCheck(file, tool, { saveTo = null } = {}) {
  if (!tool?.available) return { ok: null, reason: tool?.reason || 'flash check not configured' };
  const result = spawnSync(process.execPath, [tool.entry, 'check', '--json', file], {
    encoding: 'utf8', timeout: 10 * 60_000, maxBuffer: 64 * 1024 * 1024,
  });
  let report = null;
  try { report = JSON.parse(String(result.stdout || '').trim()); } catch { /* not JSON */ }
  if (!report || typeof report !== 'object') {
    const why = String(result.stderr || result.error || '').trim().split('\n').at(-1) || `exit ${result.status}`;
    return { ok: null, reason: `helios check gave no JSON: ${why.slice(0, 200)}` };
  }
  if (saveTo) fs.writeFileSync(saveTo, JSON.stringify(report, null, 2));
  const flash = report.flash;
  if (!flash || typeof flash.ok !== 'boolean') return { ok: null, reason: 'helios check returned no flash result' };
  return {
    ok: flash.ok,
    maxPerSecond: flash.maxPerSecond ?? null,
    worst: flash.worst ?? null,
    red: flash.red ?? null,
    checkOk: report.ok ?? null,
    problems: Array.isArray(report.problems) ? report.problems : [],
  };
}

// ---------------------------------------------------------------------------------------
// Verdict

/** Which conditions are expected to use Helios. */
export const EXPECT_HELIOS = { baseline: false, helios: true };

/**
 * Pass/fail for one run, computed from its recorded fields. Every input must be present and
 * positive: no MP4, a check that could not run or a session that never finished is a failure.
 */
export function computeVerdict(run, expect = {}) {
  const reasons = [];
  const finished = run.resultSubtype === 'success' && !run.timedOut && !run.resultIsError;
  if (!finished) {
    reasons.push(run.timedOut ? 'the session was killed at the time limit'
      : run.resultSubtype ? `the session ended with ${run.resultSubtype}${run.resultIsError ? ' (error)' : ''}`
        : 'the session never finished (no result event)');
  }
  if (!run.producedMp4) reasons.push('no MP4');
  if (EXPECT_HELIOS[run.condition] && !run.usedHelios) reasons.push('did not use Helios');
  if (run.producedMp4) {
    for (const failure of run.checksFailed || []) reasons.push(failure);
    if (!run.flash || run.flash.ok == null) reasons.push(`flash check did not run${run.flash?.reason ? `: ${run.flash.reason}` : ''}`);
    else if (!run.flash.ok) reasons.push(`flashes: ${run.flash.maxPerSecond ?? '>3'} in one second (WCAG 2.3.1 allows 3)`);
    if (expect.beatSync) {
      if (!run.sync || run.sync.ok == null) reasons.push(`sync could not be measured${run.sync?.reason ? `: ${run.sync.reason}` : ''}`);
      else if (!run.sync.ok) reasons.push(`off the beat: ${run.sync.reason}`);
    }
  }
  return { pass: reasons.length === 0, reasons };
}
