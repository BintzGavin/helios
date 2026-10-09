/**
 * Beats: placed along the local tempo curve and snapped to real onsets.
 */
import type { DrumBand } from './features.js';
import { BEAT_WEIGHTS, type Onset } from './onsets.js';
import { gaussianSmooth, lowerBound, median, round, std } from './stats.js';

/** A beat moves to a real onset at most this far away. */
export const SNAP_WINDOW = 0.03;
/**
 * How strictly beats keep to the tempo curve: the penalty for a beat interval that differs
 * from the curve's period by a factor r is TIGHTNESS·ln(r)² (Ellis 2007; librosa's default).
 */
const TIGHTNESS = 100;
/** Beats move half a beat when the kick and snare sit this much more between them than on them. */
const OFFBEAT_RATIO = 1.3;

/**
 * Places beats along the tempo curve by dynamic programming (Ellis 2007): the beat sequence that
 * best balances landing on strong onsets against keeping each interval near the curve's period
 * at that point. Unlike stepping from one beat to the next, a wrong step can't carry on.
 * Returns beat times in seconds, on the frame grid.
 */
export function trackBeats(odf: Float32Array, rate: number, bpmAt: (t: number) => number): number[] {
  const n = odf.length;
  if (n === 0) return [];
  const period = new Float64Array(n);
  for (let i = 0; i < n; i++) period[i] = (60 / bpmAt(i / rate)) * rate;

  // Smooth the onset strength by a Gaussian of 1/32 beat and scale it to unit deviation.
  const local = gaussianSmooth(odf, median(period) / 32);
  const sd = std(local);
  if (!(sd > 0)) return [];
  let top = 0;
  for (let i = 0; i < n; i++) {
    local[i] /= sd;
    top = Math.max(top, local[i]);
  }

  const score = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  const startThreshold = 0.01 * top;
  let started = false;
  for (let i = 0; i < n; i++) {
    const p = period[i];
    const from = i - Math.round(2 * p);
    const to = i - Math.round(p / 2);
    let best = -Infinity;
    let bestJ = -1;
    for (let j = Math.max(0, from); j <= to; j++) {
      const r = Math.log((i - j) / p);
      const v = score[j] - TIGHTNESS * r * r;
      if (v > best) {
        best = v;
        bestJ = j;
      }
    }
    // A predecessor before the start of the song scores nothing but the interval penalty.
    if (from < 0 && to >= from) {
      const j = Math.min(-1, Math.max(from, Math.round(i - p)));
      const r = Math.log((i - j) / p);
      const v = -TIGHTNESS * r * r;
      if (v > best) {
        best = v;
        bestJ = -1;
      }
    }
    if (best === -Infinity) best = 0;
    score[i] = local[i] + best;
    if (!started && local[i] < startThreshold) {
      back[i] = -1;
    } else {
      back[i] = bestJ;
      started = true;
    }
  }

  // The last beat: the latest local maximum of the cumulative score above half their median.
  const maxima: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (score[i] > score[i - 1] && score[i] >= score[i + 1]) maxima.push(i);
  }
  if (maxima.length === 0) return [];
  const half = median(maxima.map((i) => score[i])) / 2;
  let last = maxima[maxima.length - 1];
  for (let k = maxima.length - 1; k >= 0; k--) {
    if (score[maxima[k]] > half) {
      last = maxima[k];
      break;
    }
  }

  const frames: number[] = [];
  for (let i = last; i >= 0; i = back[i]) frames.push(i);
  return frames.reverse().map((i) => i / rate);
}

interface Candidate {
  t: number;
  weight: number;
}

/** Drum onsets as snapping candidates, weighted like the beat strength (kick first). */
export function snapCandidates(onsets: Record<DrumBand, Onset[]>): Candidate[] {
  const list: Candidate[] = [];
  for (const band of ['kick', 'snare', 'hat'] as DrumBand[]) {
    for (const o of onsets[band]) list.push({ t: o.t, weight: BEAT_WEIGHTS[band] * o.strength });
  }
  return list.sort((a, b) => a.t - b.t);
}

/** Strongest candidate within ±window of t, favouring nearer ones; undefined if none. */
function strongestNear(candidates: Candidate[], times: number[], t: number, window: number): Candidate | undefined {
  let best: Candidate | undefined;
  let bestScore = 0;
  for (let i = lowerBound(times, t - window); i < candidates.length && candidates[i].t <= t + window; i++) {
    const d = (candidates[i].t - t) / window;
    const s = candidates[i].weight * (1 - 0.5 * d * d);
    if (s > bestScore) {
      bestScore = s;
      best = candidates[i];
    }
  }
  return best;
}

/** Unsnapped beats follow their snapped neighbours when the tracker's spacing agrees this well… */
const GRID_AGREEMENT = 0.1;
/** …extrapolating at most this many beats past the first or last snapped one… */
const MAX_EXTRAPOLATE = 16;
/** …from a line through this many snapped beats. */
const EDGE_FIT_BEATS = 8;

/**
 * Moves each beat to the strongest drum onset within ±30 ms. A beat with no drum onset nearby
 * (a breakdown, a half-time bar, an intro with only clicks or pads) is placed on the grid of its
 * snapped neighbours: evenly between the snapped beats either side, or extrapolated from the
 * nearest snapped beats at the song's ends, as long as the tracker counted the same number of
 * beats there. Otherwise it keeps its place on the tempo curve, shifted by the median move of
 * the snapped ones: the onset strength peaks a little before an attack, and that is the same
 * everywhere.
 */
export function snapBeats(beats: number[], candidates: Candidate[]): number[] {
  const times = candidates.map((c) => c.t);
  const snapped = beats.map((b) => strongestNear(candidates, times, b, SNAP_WINDOW)?.t);
  const moves = beats.flatMap((b, i) => (snapped[i] === undefined ? [] : [snapped[i]! - b]));
  const shift = moves.length > 0 ? median(moves) : 0;
  const anchors = beats.flatMap((_, i) => (snapped[i] === undefined ? [] : [i]));
  const agrees = (i: number, j: number, period: number) => {
    const tracked = (beats[j] - beats[i]) / (j - i);
    return period > 0 && Math.abs(tracked / period - 1) <= GRID_AGREEMENT;
  };

  const placed = beats.map((b, i) => snapped[i] ?? b + shift);
  for (let k = 0; k + 1 < anchors.length; k++) {
    const [a, z] = [anchors[k], anchors[k + 1]];
    if (z - a < 2) continue;
    const period = (snapped[z]! - snapped[a]!) / (z - a);
    if (!agrees(a, z, period)) continue;
    for (let i = a + 1; i < z; i++) placed[i] = snapped[a]! + (i - a) * period;
  }
  if (anchors.length >= 2) {
    const edge = (from: number[], first: number, last: number, step: 1 | -1) => {
      const { slope, at } = fitLine(from.map((i) => [i, snapped[i]!]));
      const anchor = from[0];
      for (let i = first; i !== last + step && Math.abs(i - anchor) <= MAX_EXTRAPOLATE; i += step) {
        if (!agrees(Math.min(i, anchor), Math.max(i, anchor), slope)) break;
        placed[i] = at(i);
      }
    };
    edge(anchors.slice(0, EDGE_FIT_BEATS), anchors[0] - 1, 0, -1);
    edge(anchors.slice(-EDGE_FIT_BEATS).reverse(), anchors[anchors.length - 1] + 1, beats.length - 1, 1);
  }

  const out: number[] = [];
  for (const t of placed) {
    // Two beats never share an onset, and never cross.
    if (out.length > 0 && t <= out[out.length - 1] + 0.05) continue;
    out.push(t);
  }
  return out;
}

/** Least-squares line through (beat index, time) points: its slope (seconds per beat), and its time at any index. */
function fitLine(points: [number, number][]): { slope: number; at: (i: number) => number } {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n;
  const my = points.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const [x, y] of points) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  return { slope, at: (i) => my + (i - mx) * slope };
}

/**
 * The off-beat guard. A beat grid locked to off-beat hats has the kicks and snares halfway
 * between its beats (BLISS's first beat map sat a half beat early this way). When the kick and
 * snare onsets near the midpoints outweigh those near the beats, the beats move to the midpoints.
 */
export function guardOffbeat(beats: number[], onsets: Record<DrumBand, Onset[]>): number[] {
  if (beats.length < 4) return beats;
  const drums = snapCandidates({ kick: onsets.kick, snare: onsets.snare, hat: [] });
  const times = drums.map((c) => c.t);
  let on = 0;
  let off = 0;
  for (let i = 0; i + 1 < beats.length; i++) {
    on += strongestNear(drums, times, beats[i], SNAP_WINDOW)?.weight ?? 0;
    off += strongestNear(drums, times, (beats[i] + beats[i + 1]) / 2, SNAP_WINDOW)?.weight ?? 0;
  }
  if (off <= OFFBEAT_RATIO * on) return beats;
  const mids: number[] = [];
  for (let i = 0; i + 1 < beats.length; i++) mids.push((beats[i] + beats[i + 1]) / 2);
  mids.push(beats[beats.length - 1] + (beats[beats.length - 1] - beats[beats.length - 2]) / 2);
  return mids;
}

/**
 * The tempo every `step` seconds, measured on the beats themselves: a quadratic through beat
 * number against time over the beats within ±5 s (widened until there are at least 6), whose
 * slope at that time is the tempo. Fitting positions rather than intervals keeps the jitter of
 * single beats out of it, and the curvature carries a drifting tempo right to the song's ends.
 */
export function tempoCurve(beats: number[], duration: number, step = 5): { t: number; bpm: number }[] {
  if (beats.length < 2) return [];
  const out: { t: number; bpm: number }[] = [];
  for (let t = 0; t <= duration + 1e-9; t += step) {
    let span = 5;
    let lo = 0;
    let hi = 0;
    for (;;) {
      lo = lowerBound(beats, t - span);
      hi = lowerBound(beats, t + span);
      if (hi - lo >= Math.min(6, beats.length) || span > duration) break;
      span *= 1.5;
    }
    const slope = fitSlope(beats.slice(lo, hi).map((b) => b - t), hi - lo >= 6 ? 2 : 1);
    if (slope > 0) out.push({ t: round(t, 6), bpm: 60 * slope });
  }
  return out;
}

/**
 * Least-squares polynomial (degree 1 or 2) of beat number against x (seconds from the time of
 * interest), returning its slope at x = 0 in beats per second.
 */
function fitSlope(xs: number[], degree: 1 | 2): number {
  const n = xs.length;
  if (n < 2) return 0;
  // Normal equations for y = c0 + c1·x (+ c2·x²), with y = 0, 1, 2… (the beat numbers).
  const size = degree + 1;
  const a = Array.from({ length: size }, () => new Float64Array(size + 1));
  for (let i = 0; i < n; i++) {
    const powers = [1, xs[i], xs[i] * xs[i]];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) a[r][c] += powers[r] * powers[c];
      a[r][size] += powers[r] * i;
    }
  }
  // Gaussian elimination with partial pivoting.
  for (let col = 0; col < size; col++) {
    let pivot = col;
    for (let r = col + 1; r < size; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    if (Math.abs(a[col][col]) < 1e-12) return degree === 2 ? fitSlope(xs, 1) : 0;
    for (let r = 0; r < size; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c <= size; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a[1][size] / a[1][1];
}
