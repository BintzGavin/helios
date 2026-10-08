/**
 * Downbeats: which beat of every bar is beat 1, by a kick vote and a harmony vote per 32-beat block.
 */
import type { Features } from './features.js';

export const BLOCK_BEATS = 32;
/** The harmony vote wins when its phase holds at least this share of the blocks… */
const HARMONY_SHARE = 0.5;
/** …and the harmony changes at least this many times more on it than on any other phase… */
const HARMONY_RATIO = 1.5;
/** …and changes at all there (cosine distance of the chroma), rather than drums moving it a hair. */
const MIN_HARMONY_CHANGE = 0.02;

export interface Downbeats {
  /** Index (mod beatsPerBar) of the beats that start bars. */
  phase: number;
  method: 'kick' | 'harmony';
  downbeats: number[];
}

/** Kick energy at each beat: the peak kick-band power just after it, over the floor just before it. */
function kickEnergy(beats: number[], features: Features): number[] {
  const { frameRate } = features;
  const power = features.power.kick;
  return beats.map((b, i) => {
    const period = (beats[i + 1] ?? b + (b - (beats[i - 1] ?? b - 0.5))) - b;
    const at = (t: number) => Math.min(power.length - 1, Math.max(0, Math.round(t * frameRate)));
    let peak = 0;
    for (let j = at(b - 0.01); j <= at(b + 0.08); j++) peak = Math.max(peak, power[j]);
    let floor = Infinity;
    for (let j = at(b - period / 2); j <= at(b - 0.01); j++) floor = Math.min(floor, power[j]);
    return Math.max(0, peak - (Number.isFinite(floor) ? floor : 0));
  });
}

/** Mean chroma over each beat (to the next beat), normalised to unit length. */
function beatChroma(beats: number[], features: Features): Float64Array[] {
  const { frameRate, chroma, frames } = features;
  return beats.map((b, i) => {
    const end = beats[i + 1] ?? b + (b - (beats[i - 1] ?? b - 0.5));
    const v = new Float64Array(12);
    const from = Math.max(0, Math.round(b * frameRate));
    const to = Math.min(frames, Math.max(from + 1, Math.round(end * frameRate)));
    for (let f = from; f < to; f++) for (let c = 0; c < 12; c++) v[c] += chroma[f * 12 + c];
    const norm = Math.hypot(...v);
    if (norm > 0) for (let c = 0; c < 12; c++) v[c] /= norm;
    return v;
  });
}

function cosine(a: Float64Array, b: Float64Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let c = 0; c < 12; c++) {
    dot += a[c] * b[c];
    na += a[c] * a[c];
    nb += b[c] * b[c];
  }
  return na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : 1;
}

/** How much the harmony changes at each beat: the two beats after it against the two before. */
function harmonyChange(chromas: Float64Array[]): number[] {
  const sum = (from: number, to: number) => {
    const v = new Float64Array(12);
    for (let i = Math.max(0, from); i < Math.min(chromas.length, to); i++) {
      for (let c = 0; c < 12; c++) v[c] += chromas[i][c];
    }
    return v;
  };
  return chromas.map((_, i) => (i === 0 ? 0 : 1 - cosine(sum(i - 2, i), sum(i, i + 2))));
}

/** The phase with the most block wins; ties go to the larger total. */
function vote(values: number[], beatsPerBar: number): { phase: number; share: number; totals: number[] } {
  const totals = new Array(beatsPerBar).fill(0);
  const counts = new Array(beatsPerBar).fill(0);
  for (let i = 0; i < values.length; i++) {
    totals[i % beatsPerBar] += values[i];
    counts[i % beatsPerBar]++;
  }
  for (let p = 0; p < beatsPerBar; p++) totals[p] /= Math.max(1, counts[p]);

  const wins = new Array(beatsPerBar).fill(0);
  let blocks = 0;
  for (let start = 0; start < values.length; start += BLOCK_BEATS) {
    const end = Math.min(values.length, start + BLOCK_BEATS);
    // A short last block (under two bars) has too little to say.
    if (end - start < 2 * beatsPerBar && blocks > 0) break;
    const sums = new Array(beatsPerBar).fill(0);
    const n = new Array(beatsPerBar).fill(0);
    for (let i = start; i < end; i++) {
      sums[i % beatsPerBar] += values[i];
      n[i % beatsPerBar]++;
    }
    const means = sums.map((s, p) => s / Math.max(1, n[p]));
    const top = Math.max(...means);
    if (top <= 0) continue;
    wins[means.indexOf(top)]++;
    blocks++;
  }

  let phase = 0;
  for (let p = 1; p < beatsPerBar; p++) {
    if (wins[p] > wins[phase] || (wins[p] === wins[phase] && totals[p] > totals[phase])) phase = p;
  }
  return { phase, share: blocks > 0 ? wins[phase] / blocks : 0, totals };
}

/**
 * Picks the downbeat phase. The harmony vote (where the chroma changes most) wins when it holds
 * at least half the blocks and changes at least 1.5× more than any other phase; otherwise the
 * kick vote (where the kick hits hardest) decides. On ESCAPE VELOCITY the kick vote was split
 * 36% while the harmony vote held 77%.
 */
export function findDownbeats(beats: number[], features: Features, beatsPerBar: number): Downbeats {
  if (beats.length === 0) return { phase: 0, method: 'kick', downbeats: [] };

  const harmony = vote(harmonyChange(beatChroma(beats, features)), beatsPerBar);
  const others = harmony.totals.filter((_, p) => p !== harmony.phase);
  const runnerUp = others.length > 0 ? Math.max(...others) : 0;
  const ratio = runnerUp > 0 ? harmony.totals[harmony.phase] / runnerUp : harmony.totals[harmony.phase] > 0 ? Infinity : 0;

  let phase: number;
  let method: 'kick' | 'harmony';
  const changes = harmony.totals[harmony.phase] >= MIN_HARMONY_CHANGE;
  if (changes && harmony.share >= HARMONY_SHARE && ratio >= HARMONY_RATIO) {
    phase = harmony.phase;
    method = 'harmony';
  } else {
    phase = vote(kickEnergy(beats, features), beatsPerBar).phase;
    method = 'kick';
  }
  return { phase, method, downbeats: beats.filter((_, i) => i % beatsPerBar === phase) };
}
