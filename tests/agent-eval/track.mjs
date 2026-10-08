/**
 * The music-video prompt's song: a deterministic 15 s track whose tempo drifts, and the ground
 * truth the scorer measures picture sync against.
 *
 * Real songs drift (Suno takes moved 129.2 → 132.1 BPM over one song), so a video built on one
 * fixed BPM slides off the beat. This track ramps 116 → 124 BPM. Its average is 120 BPM, and a
 * fixed 120 BPM grid lands up to a quarter beat (≈125 ms) off in the middle of the song.
 *
 * What plays:
 * - silence until the first beat at 0.25 s;
 * - a kick on every beat, louder on each bar's downbeat;
 * - a snare on beats 2 and 4;
 * - a soft hi-hat on every off-beat eighth;
 * - a bass note and a chord that change on every downbeat (Am, F, C, G);
 * - one impact (a low boom and a crash) on the downbeat of bar 5, after which the hats get louder.
 *
 * The truth file uses the shape of `helios analyze` output (beats, downbeats, hits, onsets), so the
 * same file can later grade the analyzer. It is never copied into a run's working directory.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Bump when the audio or the truth changes, so cached copies are regenerated. */
export const TRACK_ID = 'drift-116-124-v1';

const DURATION = 15;
const FIRST_BEAT = 0.25;
const BPM_START = 116;
const BPM_END = 124;
const BEATS_PER_BAR = 4;
const IMPACT_BAR = 5;
const SAMPLE_RATE = 44100;

const round3 = (x) => Math.round(x * 1000) / 1000;

/** Tempo at time t: a straight ramp over the song. */
function bpmAt(t) {
  return BPM_START + ((BPM_END - BPM_START) * t) / DURATION;
}

/** Time of beat k: solves  ∫ bpm(t)/60 dt from FIRST_BEAT to t = k. */
function beatTime(k) {
  const a = (BPM_END - BPM_START) / (2 * DURATION * 60);
  const b = BPM_START / 60;
  const c = a * FIRST_BEAT * FIRST_BEAT + b * FIRST_BEAT + k;
  return (-b + Math.sqrt(b * b + 4 * a * c)) / (2 * a);
}

/** Ground truth for the track, exact to the sample before rounding to the millisecond. */
export function trackTruth() {
  const beats = [];
  for (let k = 0; ; k++) {
    const t = beatTime(k);
    if (t > DURATION - 0.2) break;
    beats.push(t);
  }
  const downbeats = beats.filter((_, k) => k % BEATS_PER_BAR === 0);
  const snare = beats.filter((_, k) => k % BEATS_PER_BAR === 1 || k % BEATS_PER_BAR === 3);
  const hat = beats.slice(0, -1).map((t, k) => (t + beats[k + 1]) / 2);
  const impact = downbeats[IMPACT_BAR];
  const tempo = [];
  for (let t = 0; t <= DURATION; t += 1) tempo.push({ t, bpm: Math.round(bpmAt(t) * 100) / 100 });
  return {
    version: 1,
    id: TRACK_ID,
    source: 'track.mp3',
    duration: DURATION,
    bpm: Math.round(((60 * (beats.length - 1)) / (beats.at(-1) - beats[0])) * 100) / 100,
    tempo,
    beatsPerBar: BEATS_PER_BAR,
    beats: beats.map(round3),
    downbeats: downbeats.map(round3),
    sections: [
      { t0: 0, t1: round3(impact), energy: 0.6 },
      { t0: round3(impact), t1: DURATION, energy: 1 },
    ],
    hits: [{ t: round3(impact), score: 1, kind: 'impact' }],
    onsets: { kick: beats.map(round3), snare: snare.map(round3), hat: hat.map(round3) },
    note: 'Ground truth for the agent-eval music-video track. Scorer input only: never give it to the agent.',
  };
}

/**
 * The beat grid the harness used before this track existed: a fixed 120 BPM track with a kick
 * every 0.5 s from t = 0, 15 s long. Rescoring results that predate a recorded truth uses it.
 */
export function legacyTruth() {
  const beats = Array.from({ length: 30 }, (_, k) => k * 0.5);
  return {
    version: 1,
    id: 'legacy-120bpm',
    source: 'track.mp3',
    duration: 15,
    bpm: 120,
    tempo: [{ t: 0, bpm: 120 }],
    beatsPerBar: 4,
    beats,
    downbeats: beats.filter((_, k) => k % 4 === 0),
    sections: [{ t0: 0, t1: 15, energy: 1 }],
    hits: [],
    onsets: { kick: beats, snare: [], hat: beats.map((t) => t + 0.25).filter((t) => t < 15) },
    note: 'Assumed: these results predate recorded ground truth, when the harness used a fixed 120 BPM track.',
  };
}

/** Seeded PRNG (mulberry32), so the noise in every hit is the same on every machine. */
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

/** Renders the track as interleaved stereo float samples in [-1, 1]. Pure: same input, same output. */
export function synthesizeTrack(truth = trackTruth(), sampleRate = SAMPLE_RATE) {
  const n = Math.round(truth.duration * sampleRate);
  const left = new Float64Array(n);
  const right = new Float64Array(n);
  const rand = prng(0x5eed);
  const at = (t) => Math.round(t * sampleRate);

  // Adds fn(s) for s seconds after t0 (s in [0, len)), with a 2 ms fade-in against clicks.
  const add = (t0, len, fn, panL = 1, panR = 1) => {
    const start = at(t0);
    const end = Math.min(n, start + at(len));
    for (let i = start; i < end; i++) {
      const s = (i - start) / sampleRate;
      const v = fn(s) * Math.min(1, s / 0.002);
      left[i] += v * panL;
      right[i] += v * panR;
    }
  };

  const impact = truth.hits[0].t;
  const downbeatSet = new Set(truth.downbeats);

  for (const t of truth.onsets.kick) {
    const gain = downbeatSet.has(t) ? 1 : 0.72;
    // A pitch drop from 150 Hz to 45 Hz; phase is the integral of the frequency.
    add(t, 0.35, (s) => gain * Math.sin(2 * Math.PI * (45 * s + (105 * (1 - Math.exp(-25 * s))) / 25)) * Math.exp(-9 * s));
  }
  for (const t of truth.onsets.snare) {
    add(t, 0.25, (s) => (0.42 * (rand() * 2 - 1) * Math.exp(-18 * s)) + 0.22 * Math.sin(2 * Math.PI * 185 * s) * Math.exp(-25 * s), 0.9, 1);
  }
  for (const t of truth.onsets.hat) {
    const gain = t > impact ? 0.14 : 0.08;
    let prev = 0;
    add(t, 0.06, (s) => {
      const x = rand() * 2 - 1;
      const hp = x - prev; // first difference: a crude high-pass
      prev = x;
      return gain * hp * Math.exp(-60 * s);
    }, 1, 0.85);
  }

  // Bass and chord per bar: Am, F, C, G. Frequencies of the chord tones (bass is the root an octave down).
  const chords = [
    [110, 130.81, 164.81], // A minor
    [87.31, 110, 130.81], // F major
    [130.81, 164.81, 196], // C major
    [98, 123.47, 146.83], // G major
  ];
  const barStarts = [...truth.downbeats, truth.duration];
  for (let bar = 0; bar < truth.downbeats.length; bar++) {
    const t0 = barStarts[bar];
    const len = barStarts[bar + 1] - t0;
    const chord = chords[bar % chords.length];
    const root = chord[0] / 2;
    const release = (s) => Math.min(1, (len - s) / 0.01); // 10 ms release into the next bar
    add(t0, len, (s) => {
      const env = (0.6 + 0.4 * Math.exp(-6 * s)) * release(s);
      return 0.26 * env * (Math.sin(2 * Math.PI * root * s) + 0.3 * Math.sin(4 * Math.PI * root * s));
    });
    add(t0, len, (s) => {
      const env = Math.min(1, s / 0.06) * (0.7 + 0.3 * Math.exp(-3 * s)) * release(s);
      return 0.05 * env * chord.reduce((sum, f) => sum + Math.sin(2 * Math.PI * f * 2 * s), 0);
    }, 0.8, 1);
  }

  // The impact: a low boom and a long crash.
  add(impact, 1.4, (s) => 0.9 * Math.sin(2 * Math.PI * (32 * s + (38 * (1 - Math.exp(-8 * s))) / 8)) * Math.exp(-2.6 * s));
  let prevCrash = 0;
  add(impact, 1.8, (s) => {
    const x = rand() * 2 - 1;
    const hp = x - 0.5 * prevCrash;
    prevCrash = x;
    return 0.3 * hp * Math.exp(-2.2 * s);
  });

  // Soft-clip and normalise to a -1 dBFS peak.
  let peak = 0;
  for (let i = 0; i < n; i++) {
    left[i] = Math.tanh(left[i]);
    right[i] = Math.tanh(right[i]);
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const scale = 0.89 / peak;
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    out[2 * i] = left[i] * scale;
    out[2 * i + 1] = right[i] * scale;
  }
  return { samples: out, sampleRate, channels: 2 };
}

/** A 16-bit PCM WAV file in memory. */
export function wavBuffer({ samples, sampleRate, channels }) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/**
 * Makes sure `<assetsDir>/track.mp3` and `<assetsDir>/track.truth.json` exist and belong to the
 * current TRACK_ID. A track left over from an older harness (for example the fixed 120 BPM one)
 * is replaced, because its beats would not match the truth.
 */
export function ensureTrack(assetsDir) {
  const track = path.join(assetsDir, 'track.mp3');
  const truthFile = path.join(assetsDir, 'track.truth.json');
  let current = null;
  try { current = JSON.parse(fs.readFileSync(truthFile, 'utf8')); } catch { /* missing or unreadable */ }
  if (current?.id === TRACK_ID && fs.existsSync(track)) return { track, truthFile, truth: current, generated: false };

  const truth = trackTruth();
  const wav = wavBuffer(synthesizeTrack(truth));
  const tmp = `${track}.tmp.mp3`;
  const result = spawnSync('ffmpeg', [
    '-v', 'error', '-y', '-f', 'wav', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '192k', tmp,
  ], { input: wav, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    fs.rmSync(tmp, { force: true });
    throw new Error(`Could not encode track.mp3 with ffmpeg: ${String(result.stderr || result.error || '').trim()}`);
  }
  fs.renameSync(tmp, track);
  fs.writeFileSync(truthFile, `${JSON.stringify(truth, null, 2)}\n`);
  return { track, truthFile, truth, generated: true };
}

/** Where the track stands, without writing anything (for --dry-run). */
export function trackStatus(assetsDir) {
  const track = path.join(assetsDir, 'track.mp3');
  let current = null;
  try { current = JSON.parse(fs.readFileSync(path.join(assetsDir, 'track.truth.json'), 'utf8')); } catch { /* missing */ }
  if (current?.id === TRACK_ID && fs.existsSync(track)) return `track.mp3 is current (${TRACK_ID})`;
  if (fs.existsSync(track)) return `track.mp3 is stale (no ${TRACK_ID} truth) and will be regenerated`;
  return `track.mp3 will be generated (${TRACK_ID})`;
}
