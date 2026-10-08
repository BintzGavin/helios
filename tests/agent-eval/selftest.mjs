/**
 * Self-test for the agent scoreboard. No network, no claude, nothing spent: it needs Node 18+ and
 * ffmpeg/ffprobe on PATH.
 *
 *   node --test tests/agent-eval/selftest.mjs
 *
 * It renders tiny videos of a box that flashes on the track's true beats, off the beat, at random,
 * on a fixed 120 BPM grid, or never, and checks the sync scores order correctly. It also checks the
 * track and its truth, the verdict rules, the flash check plumbing (with a stand-in `helios check`),
 * --dry-run, and --rescore on fixture result directories in the old and new formats.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  ensureTrack, legacyTruth, synthesizeTrack, trackTruth, TRACK_ID,
} from './track.mjs';
import {
  SYNC, computeVerdict, flashTool, frameMotion, runFlashCheck, scoreSync,
} from './metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUN = path.join(HERE, 'run.mjs');
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;
const skip = hasFfmpeg ? false : 'ffmpeg and ffprobe are needed on PATH';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-agent-eval-selftest-'));
// HELIOS_EVAL_SELFTEST_KEEP=1 keeps the videos and fixture scoreboards for a look.
after(() => {
  if (process.env.HELIOS_EVAL_SELFTEST_KEEP) console.error(`Kept the self-test files in ${tmp}`);
  else fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------
// Tiny test videos

const W = 192;
const H = 108;
const FPS = 30;

/** A box whose brightness jumps at each time in `hits` and decays over ~120 ms. */
function flashesAt(hits) {
  const sorted = [...hits].sort((a, b) => a - b);
  return (t) => {
    let last = null;
    for (const h of sorted) if (h <= t + 1e-9) last = h;
    return last == null ? 0 : Math.exp(-(t - last) / 0.12);
  };
}

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Writes a grey MP4 of `seconds` at 30 fps whose centre box has brightness level(t) in 0..1. */
function renderVideo(file, level, seconds = 15) {
  const n = Math.round(seconds * FPS);
  const frame = W * H;
  const buf = Buffer.alloc(frame * n, 30);
  for (let i = 0; i < n; i++) {
    const v = Math.round(40 + 215 * level(i / FPS));
    for (let y = 36; y < 72; y++) buf.fill(v, i * frame + y * W + 66, i * frame + y * W + 126);
  }
  const input = ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0'];
  let result = spawnSync('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', file], { input: buf });
  if (result.status !== 0) {
    // ffmpeg builds without libx264
    result = spawnSync('ffmpeg', [...input, '-c:v', 'mpeg4', '-q:v', '3', '-pix_fmt', 'yuv420p', file], { input: buf });
  }
  assert.equal(result.status, 0, `ffmpeg could not encode ${file}: ${result.stderr}`);
  return file;
}

const truth = trackTruth();
const midBeats = truth.beats.slice(0, -1).map((b, k) => (b + truth.beats[k + 1]) / 2);
const rand = prng(7);
const randomHits = truth.beats.map(() => 0.25 + rand() * 14.5);
const grid120 = Array.from({ length: 30 }, (_, k) => 0.25 + k * 0.5);

const PATTERNS = {
  onBeat: flashesAt(truth.beats),
  offBeat: flashesAt(midBeats),
  random: flashesAt(randomHits),
  fixed120: flashesAt(grid120),
  static: () => 0.5,
};

// ---------------------------------------------------------------------------------------

describe('track', { skip }, () => {
  test('truth: 30 beats drifting 116 → 124 BPM, bars of four, one impact on a downbeat', () => {
    assert.equal(truth.id, TRACK_ID);
    assert.equal(truth.beats.length, 30);
    assert.equal(truth.beats[0], 0.25);
    const gaps = truth.beats.slice(1).map((b, k) => b - truth.beats[k]);
    assert.ok(gaps[0] > 60 / 117 && gaps.at(-1) < 60 / 123, `beat gaps ${gaps[0]} → ${gaps.at(-1)}`);
    for (let k = 1; k < gaps.length; k++) assert.ok(gaps[k] <= gaps[k - 1] + 0.0011, 'the tempo only speeds up');
    assert.deepEqual(truth.downbeats, truth.beats.filter((_, k) => k % 4 === 0));
    assert.deepEqual(truth.onsets.snare, truth.beats.filter((_, k) => k % 4 === 1 || k % 4 === 3));
    assert.equal(truth.hits.length, 1);
    assert.ok(truth.downbeats.includes(truth.hits[0].t));
    // A fixed 120 BPM grid from the first beat drifts more than 100 ms off mid-song.
    const worst = Math.max(...truth.beats.map((b, k) => Math.abs(b - (0.25 + k * 0.5))));
    assert.ok(worst > 0.1, `fixed-grid drift ${worst}`);
  });

  test('synthesis is deterministic', () => {
    const a = synthesizeTrack(truth, 8000).samples;
    const b = synthesizeTrack(truth, 8000).samples;
    assert.equal(a.length, b.length);
    assert.ok(a.every((v, i) => v === b[i]));
  });

  test('ensureTrack writes track.mp3 and track.truth.json; the mp3 lines up with the truth', () => {
    const dir = path.join(tmp, 'assets');
    fs.mkdirSync(dir);
    // A stale track from the old fixed-tempo harness, with no truth: must be replaced.
    fs.writeFileSync(path.join(dir, 'track.mp3'), 'stale');
    const first = ensureTrack(dir);
    assert.equal(first.generated, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(first.truthFile, 'utf8')), JSON.parse(JSON.stringify(truth)));
    assert.equal(ensureTrack(dir).generated, false, 'a current track is reused');

    // Decode and cross-correlate with the synthesized PCM: an encoder delay would shift every beat.
    const sr = 8000;
    const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', first.track, '-ac', '1', '-ar', String(sr), '-f', 'f32le', 'pipe:1'], { maxBuffer: 1 << 26 });
    assert.equal(dec.status, 0);
    const got = new Float32Array(dec.stdout.buffer.slice(dec.stdout.byteOffset, dec.stdout.byteOffset + dec.stdout.length));
    const { samples } = synthesizeTrack(truth, sr);
    const ref = Float32Array.from({ length: samples.length / 2 }, (_, i) => (samples[2 * i] + samples[2 * i + 1]) / 2);
    let best = { lag: null, c: -Infinity };
    for (let lag = -200; lag <= 200; lag++) {
      let c = 0;
      for (let i = 1000; i < ref.length - 1000; i += 2) c += ref[i] * (got[i + lag] || 0);
      if (c > best.c) best = { lag, c };
    }
    assert.ok(Math.abs(best.lag) <= 8, `decoded track is offset by ${best.lag} samples (${(best.lag / sr) * 1000} ms)`);
  });
});

describe('sync', { skip }, () => {
  const scores = {};
  before(() => {
    for (const [name, level] of Object.entries(PATTERNS)) {
      const file = renderVideo(path.join(tmp, `${name}.mp4`), level);
      scores[name] = scoreSync(frameMotion(file, { maxSeconds: 16 }), truth);
    }
  });

  test('beat-synced flashes pass with a high score', () => {
    const s = scores.onBeat;
    assert.equal(s.ok, true, s.reason);
    assert.ok(s.score >= 0.9, `score ${s.score}`);
    assert.ok(s.coverage >= 0.9, `coverage ${s.coverage}`);
    assert.ok(s.corr >= 0.3, `corr ${s.corr}`);
  });

  test('off-beat, random, fixed-grid and static videos fail', () => {
    for (const name of ['offBeat', 'random', 'fixed120', 'static']) {
      assert.equal(scores[name].ok, false, `${name} should fail: ${JSON.stringify(scores[name])}`);
      assert.ok(scores[name].score < SYNC.minScore, `${name} score ${scores[name].score}`);
      assert.ok(typeof scores[name].reason === 'string' && scores[name].reason.length > 0);
    }
    assert.equal(scores.static.score, 0);
    assert.equal(scores.static.peaks, 0);
    assert.equal(scores.offBeat.onBeat, 0);
  });

  test('scores order on-beat > fixed grid, random > off-beat, static', () => {
    assert.ok(scores.onBeat.score > scores.fixed120.score);
    assert.ok(scores.onBeat.score > scores.random.score);
    assert.ok(scores.random.score >= scores.offBeat.score);
    assert.ok(scores.onBeat.corr > scores.random.corr && scores.onBeat.corr > scores.offBeat.corr);
    assert.ok(scores.onBeat.corr > scores.static.corr);
  });

  test('a file that cannot be decoded is a failed measurement, not a pass', () => {
    const bad = path.join(tmp, 'not-a-video.mp4');
    fs.writeFileSync(bad, 'nope');
    const s = scoreSync(frameMotion(bad), truth);
    assert.equal(s.ok, null);
    assert.match(s.reason, /ffmpeg/);
  });
});

// ---------------------------------------------------------------------------------------
// Verdict

const good = {
  condition: 'helios', usedHelios: true, producedMp4: true, checksFailed: [],
  resultSubtype: 'success', timedOut: false, resultIsError: false,
  flash: { ok: true, maxPerSecond: 1 },
  sync: { ok: true, score: 0.95 },
};

describe('verdict', () => {
  test('a complete, on-spec run passes', () => {
    assert.deepEqual(computeVerdict(good, { beatSync: true }), { pass: true, reasons: [] });
    assert.equal(computeVerdict({ ...good, condition: 'baseline', usedHelios: false }, { beatSync: true }).pass, true);
  });

  const failing = {
    'no MP4': { producedMp4: false, flash: { ok: null, reason: 'no MP4' } },
    'did not use Helios': { usedHelios: false },
    'off-spec MP4': { checksFailed: ['duration 12.00s (asked 15s)'] },
    'flash failure': { flash: { ok: false, maxPerSecond: 5 } },
    'flash check did not run': { flash: { ok: null, reason: 'the Helios CLI is not built' } },
    'flash missing entirely': { flash: undefined },
    'off the beat': { sync: { ok: false, score: 0.2, reason: '4 of 20 picture changes land on a beat' } },
    'sync not measured': { sync: { ok: null, reason: 'the MP4 copy is not in the results directory' } },
    'sync missing entirely': { sync: undefined },
    'timed out': { timedOut: true },
    'budget cap': { resultSubtype: 'error_max_budget_usd' },
    'never finished': { resultSubtype: null },
    'errored result': { resultIsError: true },
  };
  for (const [name, patch] of Object.entries(failing)) {
    test(`fails: ${name}`, () => {
      const v = computeVerdict({ ...good, ...patch }, { beatSync: true });
      assert.equal(v.pass, false);
      assert.ok(v.reasons.length > 0);
    });
  }

  test('sync is only required where the prompt asks for it', () => {
    assert.equal(computeVerdict({ ...good, sync: null }, {}).pass, true);
    assert.equal(computeVerdict({ ...good, sync: null }, { beatSync: true }).pass, false);
  });

  test('reasons name what failed', () => {
    const v = computeVerdict({ ...good, usedHelios: false, flash: { ok: null, reason: 'CLI not built' } }, {});
    assert.deepEqual(v.reasons, ['did not use Helios', 'flash check did not run: CLI not built']);
  });
});

// ---------------------------------------------------------------------------------------
// Flash check plumbing, with a stand-in for `helios check --json` that follows the contract

const FAKE_CHECK = `
const [cmd, ...rest] = process.argv.slice(2);
if (cmd !== 'check') { console.error("error: unknown command '" + cmd + "'"); process.exit(1); }
if (rest.includes('--help')) { console.log('Usage: helios check <video> [--json]'); process.exit(0); }
const file = rest.find((a) => !a.startsWith('--'));
const fs = await import('node:fs');
if (!fs.existsSync(file)) { console.error('Check failed: cannot read ' + file); process.exit(1); }
const flashy = file.includes('flashy');
const report = {
  ok: !flashy, file,
  video: { codec: 'h264', width: 192, height: 108, fps: 30, duration: 15, frames: 450, pixFmt: 'yuv420p', color: null },
  audio: null,
  flash: flashy ? { ok: false, maxPerSecond: 5, worst: { t0: 1, t1: 2, count: 5 }, red: false } : { ok: true, maxPerSecond: 1, worst: null, red: false },
  problems: flashy ? ['5 flashes in one second (1.0-2.0 s): WCAG 2.3.1 allows 3.'] : [],
  warnings: [],
};
console.log(JSON.stringify(report));
process.exit(report.ok ? 0 : 1);
`;

describe('flash', { skip }, () => {
  let fake;
  before(() => {
    fake = path.join(tmp, 'fake-helios.mjs');
    fs.writeFileSync(fake, FAKE_CHECK);
  });

  test('reads the flash result from helios check --json, pass and fail alike', () => {
    const tool = flashTool(fake);
    assert.equal(tool.available, true, tool.reason);
    const calm = renderVideo(path.join(tmp, 'calm.mp4'), () => 0.5, 1);
    const flashy = renderVideo(path.join(tmp, 'flashy.mp4'), () => 0.5, 1);
    assert.equal(runFlashCheck(calm, tool).ok, true);
    const bad = runFlashCheck(flashy, tool);
    assert.equal(bad.ok, false);
    assert.equal(bad.maxPerSecond, 5);
  });

  test('a CLI that is missing, unbuilt or has no check command is recorded as null with a reason', () => {
    const missing = flashTool(path.join(tmp, 'nope.js'));
    assert.equal(missing.available, false);
    assert.equal(runFlashCheck('x.mp4', missing).ok, null);

    const noCheck = path.join(tmp, 'old-cli.mjs');
    fs.writeFileSync(noCheck, "console.error(\"error: unknown command 'check'\"); process.exit(1);");
    const old = flashTool(noCheck);
    assert.equal(old.available, false);
    assert.match(old.reason, /unknown command 'check'/);

    // The default entry imports ../dist; without a build it must say so instead of running.
    const fakeRepo = path.join(tmp, 'repo', 'packages', 'cli', 'bin');
    fs.mkdirSync(fakeRepo, { recursive: true });
    fs.writeFileSync(path.join(fakeRepo, 'helios.js'), "import('../dist/index.js');");
    const unbuilt = flashTool(path.join(fakeRepo, 'helios.js'), { defaultEntry: path.join(fakeRepo, 'helios.js') });
    assert.equal(unbuilt.available, false);
    assert.match(unbuilt.reason, /not built/);
  });

  test('a check that prints no JSON is a failed check, not a pass', () => {
    const silent = path.join(tmp, 'silent-cli.mjs');
    fs.writeFileSync(silent, "if (process.argv.includes('--help')) process.exit(0); console.error('Check failed: boom'); process.exit(1);");
    const r = runFlashCheck(path.join(tmp, 'calm.mp4'), flashTool(silent));
    assert.equal(r.ok, null);
    assert.match(r.reason, /no JSON/);
  });
});

// ---------------------------------------------------------------------------------------
// The CLI: --dry-run and --rescore

function run(args) {
  return spawnSync(process.execPath, [RUN, ...args], { encoding: 'utf8', timeout: 120_000 });
}

describe('run.mjs', { skip }, () => {
  test('--dry-run prints the commands, loads the plugin only for helios, and writes nothing', () => {
    const plugin = path.join(tmp, 'plugin');
    fs.mkdirSync(path.join(plugin, '.claude-plugin'), { recursive: true });
    fs.mkdirSync(path.join(plugin, 'skills', 'make-video'), { recursive: true });
    fs.writeFileSync(path.join(plugin, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'helios', version: '9.9.9' }));
    fs.writeFileSync(path.join(plugin, 'skills', 'make-video', 'SKILL.md'), '---\nname: make-video\n---\n');
    fs.writeFileSync(path.join(plugin, '.mcp.json'), JSON.stringify({ mcpServers: { helios: { command: 'helios', args: ['mcp'] } } }));
    const out = path.join(tmp, 'dry-results');
    const track = path.join(HERE, 'assets', 'track.mp3');
    const trackBefore = fs.existsSync(track) ? fs.statSync(track).mtimeMs : null;

    const res = run(['--dry-run', '--plugin-dir', plugin, '--out', out, '--prompts', 'music-video,logo-reveal']);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /4 run\(s\)/);
    assert.match(res.stdout, /plugin `helios` 9\.9\.9/);
    assert.match(res.stdout, /1 skill \(make-video\)/);
    assert.match(res.stdout, /declares MCP: helios/);
    assert.match(res.stdout, /Music track: /);
    assert.match(res.stdout, /Flash check: /);
    assert.equal(res.stdout.split(`--plugin-dir ${plugin}`).length - 1, 2, 'only the two helios runs load the plugin');
    assert.equal(fs.existsSync(out), false, 'a dry run creates no results directory');
    assert.equal(fs.existsSync(track) ? fs.statSync(track).mtimeMs : null, trackBefore, 'a dry run does not touch the track');

    const byDefault = run(['--dry-run', '--prompts', 'logo-reveal', '--conditions', 'helios', '--out', out]);
    assert.equal(byDefault.status, 0, byDefault.stderr);
    assert.match(byDefault.stdout, new RegExp(`--plugin-dir ${path.join(HERE, '..', '..', 'plugins', 'helios').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    const wrapped = run(['--dry-run', '--skills-dir', plugin, '--prompts', 'logo-reveal', '--conditions', 'helios', '--out', out]);
    assert.equal(wrapped.status, 0, wrapped.stderr);
    assert.match(wrapped.stdout, /skills wrapped from/);

    assert.equal(run(['--dry-run', '--plugin-dir', plugin, '--skills-dir', plugin]).status, 1);
    const typo = run(['--dry-run', '--plugin_dir', plugin]);
    assert.equal(typo.status, 1);
    assert.match(typo.stderr, /Unknown option/);
  });

  test('a full run with a stand-in claude scores each run and writes the board', () => {
    // Emits a stream-json transcript and renders an MP4 in its working directory, like a session
    // would. With --plugin-dir it "uses Helios" and renders 5 s; without, it renders 3 s (off-spec).
    const fakeClaude = path.join(tmp, 'fake-claude.mjs');
    fs.writeFileSync(fakeClaude, `#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const helios = process.argv.includes('--plugin-dir');
const emit = (e) => process.stdout.write(JSON.stringify(e) + '\\n');
emit({ type: 'system', subtype: 'init', model: 'stand-in', plugins: helios ? [{ name: 'helios' }] : [], mcp_servers: helios ? [{ name: 'helios', status: 'connected' }] : [], skills: helios ? ['helios:make-video'] : [] });
const command = helios ? 'npx @helios-project/cli render logo.html -o logo.mp4' : 'ffmpeg -i frames/%04d.png logo.mp4';
emit({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] } });
if (helios) fs.writeFileSync('package.json', JSON.stringify({ dependencies: { '@helios-project/cli': '*' } }));
const src = ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=gray:s=${W}x${H}:r=30:d=' + (helios ? 5 : 3)];
let r = spawnSync('ffmpeg', [...src, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'logo.mp4']);
if (r.status !== 0) r = spawnSync('ffmpeg', [...src, '-c:v', 'mpeg4', '-pix_fmt', 'yuv420p', 'logo.mp4']);
emit({ type: 'result', subtype: 'success', is_error: false, result: 'Rendered logo.mp4', total_cost_usd: 0, num_turns: 2, duration_ms: 1000 });
`);
    fs.chmodSync(fakeClaude, 0o755);
    const fakeCheck = path.join(tmp, 'fake-helios-live.mjs');
    fs.writeFileSync(fakeCheck, FAKE_CHECK);
    const plugin = path.join(tmp, 'plugin'); // made by the dry-run test above
    const out = path.join(tmp, 'live-results');

    const res = run(['--claude-bin', fakeClaude, '--helios-cli', fakeCheck, '--plugin-dir', plugin, '--prompts', 'logo-reveal', '--out', out]);
    assert.equal(res.status, 0, res.stderr);
    const md = fs.readFileSync(path.join(out, 'scoreboard.md'), 'utf8');
    assert.match(md.split('\n').find((l) => l.startsWith('| logo-reveal | helios |')), /\| PASS \| yes \|.*\| ok \(max 1\/s\) \| – \|/);
    assert.match(md.split('\n').find((l) => l.startsWith('| logo-reveal | baseline |')), /\| FAIL \| no \|.*duration 3\.00s \(asked 5s\)/);

    const helios = JSON.parse(fs.readFileSync(path.join(out, 'logo-reveal__helios', 'metrics.json'), 'utf8'));
    assert.equal(helios.verdict.pass, true);
    assert.deepEqual(helios.pluginsLoaded, ['helios']);
    assert.deepEqual(helios.mcpServersLoaded, ['helios:connected']);
    assert.equal(helios.flash.ok, true);
    assert.equal(helios.sync, null);
    for (const f of ['deliverable.mp4', 'sheet.png', 'check.json', 'transcript.jsonl']) {
      assert.ok(fs.existsSync(path.join(out, 'logo-reveal__helios', f)), `${f} is kept`);
    }
    const board = JSON.parse(fs.readFileSync(path.join(out, 'scoreboard.json'), 'utf8'));
    assert.equal(board.meta.plugin.version, '9.9.9');
    assert.equal(board.meta.flashTool.available, true);
    assert.equal(board.meta.currentPrompts, undefined);
  });

  const prompts = JSON.parse(fs.readFileSync(path.join(HERE, 'prompts.json'), 'utf8'));
  const promptsFor = (ids, dropBeatSync) => ids.map((id) => {
    const p = JSON.parse(JSON.stringify(prompts.find((x) => x.id === id)));
    if (dropBeatSync) delete p.expect.beatSync; // results from before beatSync existed
    return p;
  });
  const baseResult = (prompt, condition, extra) => ({
    id: `${prompt}__${condition}`, prompt, condition, repeat: 1, usedHelios: condition === 'helios', heliosSkillCalls: [],
    tools: condition === 'helios' ? ['helios'] : ['puppeteer', 'ffmpeg'], producedMp4: true, passed: true, checksFailed: [],
    probe: { durationSec: prompt === 'music-video' ? 15 : 5, width: W, height: H, fps: 30, audio: prompt === 'music-video' },
    minutes: 3, costUsd: 2.5, turns: 30, resultSubtype: 'success', timedOut: false, failure: '', ...extra,
  });
  const writeFixture = (dir, meta, results, videos) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'scoreboard.json'), JSON.stringify({ meta, results }, null, 2));
    for (const r of results) fs.mkdirSync(path.join(dir, r.id), { recursive: true });
    for (const [id, level] of Object.entries(videos)) {
      renderVideo(path.join(dir, id, 'deliverable.mp4'), level, id.startsWith('music') ? 15 : 5);
    }
  };
  const rowOf = (md, id) => {
    const [prompt, condition] = id.split('__');
    return md.split('\n').find((l) => l.startsWith(`| ${prompt} | ${condition} |`));
  };

  test('--rescore fills flash, sync and verdict on results recorded with ground truth', () => {
    const dir = path.join(tmp, 'results-new');
    const meta = {
      startedAt: '2026-10-08T00:00:00.000Z', model: 'claude-opus-5-5', budget: 8, timeoutMin: 40,
      plugin: { kind: 'plugin', pluginDir: '/x/plugins/helios', source: '/x/plugins/helios', name: 'helios', version: '1.0.0', skills: ['make-video'], skillCount: 1, mcpServers: ['helios'], commit: 'abc1234', dirty: false },
      prompts: promptsFor(['music-video', 'logo-reveal']),
      track: { id: TRACK_ID, file: 'track.truth.json' },
    };
    const results = [
      baseResult('music-video', 'baseline'),
      baseResult('music-video', 'helios'),
      baseResult('logo-reveal', 'baseline', { id: 'logo-reveal__baseline' }),
      baseResult('logo-reveal', 'helios', { usedHelios: false, tools: ['playwright'] }),
    ];
    writeFixture(dir, meta, results, {
      'music-video__baseline': PATTERNS.offBeat,
      'music-video__helios': PATTERNS.onBeat,
      'logo-reveal__helios': () => 0.5,
    });
    // The fake check fails any path containing "flashy": put the baseline logo there.
    fs.renameSync(path.join(dir, 'logo-reveal__baseline'), path.join(dir, 'flashy-logo'));
    results[2].id = 'flashy-logo';
    fs.writeFileSync(path.join(dir, 'scoreboard.json'), JSON.stringify({ meta, results }, null, 2));
    renderVideo(path.join(dir, 'flashy-logo', 'deliverable.mp4'), () => 0.5, 5);
    fs.writeFileSync(path.join(dir, 'track.truth.json'), JSON.stringify(truth));
    const fake = path.join(tmp, 'fake-helios-rescore.mjs');
    fs.writeFileSync(fake, FAKE_CHECK);

    const res = run(['--rescore', dir, '--helios-cli', fake]);
    assert.equal(res.status, 0, res.stderr);
    const md = fs.readFileSync(path.join(dir, 'scoreboard.md'), 'utf8');
    assert.equal(res.stdout.trim(), md.trim());
    assert.match(md, /\| Condition \| Runs \| Verdict pass \| MP4 \| Passed checks \| Used Helios \| Flash ok \| Sync ok \|/);
    assert.match(md, /\| Prompt \| Condition \| Verdict \| .* \| Flash \| Sync \| .* Why it failed \|/);
    assert.match(md, /plugin `helios` 1\.0\.0 from `\/x\/plugins\/helios` @ abc1234/);
    assert.match(md, new RegExp(`Music track: \`${TRACK_ID}\``));

    assert.match(rowOf(md, 'music-video__helios'), /\| PASS \|.*\| ok \(max 1\/s\) \| ok 1\.00/);
    assert.match(rowOf(md, 'music-video__baseline'), /\| FAIL \|.*\| FAIL 0\.00 .*off the beat/);
    assert.match(md.split('\n').find((l) => l.startsWith('| logo-reveal | baseline |')), /\| FAIL \|.*FAIL \(5\/s\).*flashes: 5 in one second/);
    assert.match(rowOf(md, 'logo-reveal__helios'), /\| FAIL \|.*did not use Helios/);
    assert.match(md, /\| baseline \| 2 \| 0\/2 \(0%\) \|/);
    assert.match(md, /\| helios \| 2 \| 1\/2 \(50%\) \|/);

    const saved = JSON.parse(fs.readFileSync(path.join(dir, 'music-video__helios', 'metrics.json'), 'utf8'));
    assert.equal(saved.verdict.pass, true);
    assert.equal(saved.sync.truth, TRACK_ID);
    assert.ok(fs.existsSync(path.join(dir, 'music-video__helios', 'sync.json')));
    assert.ok(fs.existsSync(path.join(dir, 'music-video__helios', 'check.json')));

    // Without a working CLI the earlier flash results are kept, not thrown away.
    const again = run(['--rescore', dir, '--helios-cli', path.join(tmp, 'nope.js')]);
    assert.equal(again.status, 0, again.stderr);
    assert.match(rowOf(fs.readFileSync(path.join(dir, 'scoreboard.md'), 'utf8'), 'music-video__helios'), /\| PASS \|/);
  });

  test('--rescore on old results: legacy beat grid assumed, a missing MP4 copy is n/a and fails', () => {
    const dir = path.join(tmp, 'results-old');
    const legacy = legacyTruth();
    // The scoreboard.json format from before flash/sync/verdict: no meta.track, no new fields.
    const meta = {
      startedAt: '2026-10-01T00:00:00.000Z', model: 'claude-opus-5-5', budget: 8, timeoutMin: 40,
      plugin: { pluginDir: '/x/_plugin-helios', skillCount: 12, source: '/Users/x/Developer/helios-skills', commit: 'def5678' },
      prompts: promptsFor(['music-video', 'logo-reveal'], true),
    };
    const results = [
      baseResult('music-video', 'helios'),
      baseResult('music-video', 'baseline'),
      baseResult('logo-reveal', 'baseline', { producedMp4: false, passed: false, probe: null, failure: 'no MP4' }),
    ];
    for (const r of results) delete r.resultIsError;
    writeFixture(dir, meta, results, { 'music-video__helios': flashesAt(legacy.beats) });
    const fake = path.join(tmp, 'fake-helios-old.mjs');
    fs.writeFileSync(fake, FAKE_CHECK);

    const res = run(['--rescore', dir, '--helios-cli', fake]);
    assert.equal(res.status, 0, res.stderr);
    const md = fs.readFileSync(path.join(dir, 'scoreboard.md'), 'utf8');
    assert.match(md, /12 skills/);
    assert.match(md, /Music track: `legacy-120bpm` \(assumed/);
    assert.match(rowOf(md, 'music-video__helios'), /\| PASS \|.*\| ok 1\.00/);
    const missing = rowOf(md, 'music-video__baseline');
    assert.match(missing, /\| FAIL \|.*\| n\/a \| n\/a \|.*not in the results directory/);
    const noMp4 = rowOf(md, 'logo-reveal__baseline');
    assert.match(noMp4, /\| FAIL \|.*\| – \| – \|.*no MP4/);
    assert.match(md, /\| baseline \| 2 \| 0\/2 \(0%\) \| 1\/2 \| .* \| 0\/1 \(1 n\/a\) \| 0\/1 \(1 n\/a\) \|/);

    // Rescoring twice gives the same board (the legacy assumption sticks).
    const first = md.replace(/ · rescored [^\n]*/, '');
    assert.equal(run(['--rescore', dir, '--helios-cli', fake]).status, 0);
    assert.equal(fs.readFileSync(path.join(dir, 'scoreboard.md'), 'utf8').replace(/ · rescored [^\n]*/, ''), first);
  });
});
