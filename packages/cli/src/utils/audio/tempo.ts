/**
 * Local tempo: songs drift (ESCAPE VELOCITY went from 131.5 to 133.9 BPM), so the tempo is
 * fitted on 20 s windows every 5 s instead of once for the song.
 */
import { mean, median } from './stats.js';

export const TEMPO_WINDOW = 20;
export const TEMPO_STEP = 5;
/** Fraction of windows dropped as the weakest (breakdowns, where the beat stops). */
export const DROP_WEAKEST = 0.2;
export const BPM_STEP = 0.05;
export const PHASE_STEP = 0.004;
/** Windows search this far either side of the song's tempo, so no window flips to half or double time. */
const LOCAL_SPAN = 0.08;
/** Search grids for the first, coarse passes. */
const COARSE_BPM_STEP = 0.5;
const MID_BPM_STEP = 0.25;
const COARSE_PHASE_STEP = 0.008;
/**
 * A window has a beat when its grid contrast is at least this fraction of the song's mean onset
 * strength. Noise scores about 0.1, a drum loop about 5.
 */
const MIN_CLARITY = 0.3;
/** Windows used to find the song's tempo. */
const SONG_TEMPO_WINDOWS = 12;
/** Octave prior: a log-normal around 120 BPM, one octave wide, only to break half/double ties. */
const PRIOR_CENTRE = 120;

export interface TempoWindow {
  /** Centre of the window, in seconds. */
  t: number;
  bpm: number;
  /** Grid contrast at the best fit: mean onset strength on the beats minus between them. */
  strength: number;
  kept: boolean;
}

export interface TempoFit {
  windows: TempoWindow[];
  /** The song's tempo from the first pass (before the local fits). */
  songBpm: number;
  /** Smoothed tempo at any time, from the kept windows. */
  bpmAt(t: number): number;
}

/** odf at fractional frame i, linearly interpolated (so a grid can sit between frames). */
function at(odf: Float32Array, i: number): number {
  const i0 = Math.floor(i);
  return odf[i0] + (odf[i0 + 1] - odf[i0]) * (i - i0);
}

/**
 * Contrast of a beat grid: the mean of `odf` on the grid points minus its mean halfway between
 * them. Grid points are centre + offset + k·period, inside [centre - half, centre + half].
 * With `subdivided`, adds half the contrast of the grid at twice the tempo (beats and halves
 * against quarters): a real tempo's off-beats line up too, a 3:2 cross-grid's don't.
 */
function gridContrast(
  odf: Float32Array, rate: number, centre: number, half: number, period: number, offset: number, subdivided = false,
): number {
  const first = Math.ceil((-half - offset) / period);
  const last = Math.floor((half - offset) / period);
  let on = 0;
  let mid = 0;
  let quarters = 0;
  let n = 0;
  const limit = odf.length - 1;
  for (let k = first; k <= last; k++) {
    const i = (centre + offset + k * period) * rate;
    const step = period * rate;
    if (i < 0 || i + step > limit) continue;
    on += at(odf, i);
    mid += at(odf, i + step / 2);
    if (subdivided) quarters += at(odf, i + step / 4) + at(odf, i + (3 * step) / 4);
    n++;
  }
  if (n === 0) return 0;
  const beat = (on - mid) / n;
  return subdivided ? beat + 0.5 * ((on + mid) / 2 - quarters / 2) / n : beat;
}

interface Fit {
  bpm: number;
  offset: number;
  score: number;
}

function bestFit(
  odf: Float32Array, rate: number, centre: number, half: number,
  bpmLo: number, bpmHi: number, bpmStep: number,
  phase: (period: number) => [number, number, number],
): Fit {
  let best: Fit = { bpm: bpmLo, offset: 0, score: -Infinity };
  const steps = Math.floor((bpmHi - bpmLo) / bpmStep + 1e-9);
  for (let s = 0; s <= steps; s++) {
    // Whole steps from a rounded start, so BPMs come out as 131.55, not 131.54999.
    const bpm = Math.round((bpmLo + s * bpmStep) / bpmStep) * bpmStep;
    const period = 60 / bpm;
    const [from, to, step] = phase(period);
    for (let offset = from; offset < to; offset += step) {
      const score = gridContrast(odf, rate, centre, half, period, offset);
      if (score > best.score) best = { bpm, offset, score };
    }
  }
  return best;
}

function windowCentres(duration: number): { t: number; half: number }[] {
  if (duration <= TEMPO_WINDOW) return [{ t: duration / 2, half: duration / 2 }];
  const out: { t: number; half: number }[] = [];
  for (let start = 0; start + TEMPO_WINDOW <= duration + 1e-9; start += TEMPO_STEP) {
    out.push({ t: start + TEMPO_WINDOW / 2, half: TEMPO_WINDOW / 2 });
  }
  const lastEnd = out[out.length - 1].t + TEMPO_WINDOW / 2;
  if (duration - lastEnd > TEMPO_STEP / 2) out.push({ t: duration - TEMPO_WINDOW / 2, half: TEMPO_WINDOW / 2 });
  return out;
}

/**
 * Fits the tempo on 20 s windows every 5 s: BPM in 0.05 steps and phase in 4 ms steps, inside
 * `range`. First the song's tempo is found from all windows at a coarse resolution (this is
 * where the range and the octave prior settle half or double time), then each window is fitted
 * finely within ±8% of it. The weakest 20% of windows are dropped and the rest smoothed.
 */
export function fitTempo(odf: Float32Array, rate: number, duration: number, range: [number, number]): TempoFit {
  const [minBpm, maxBpm] = range;
  const centres = windowCentres(duration);
  const level = mean(odf);

  // Pass 1: the song's tempo. Sum each window's best (subdivided) contrast per tempo.
  const steps = Math.floor((maxBpm - minBpm) / COARSE_BPM_STEP) + 1;
  const curve = new Float64Array(steps);
  // Up to a dozen windows spread over the song are plenty to settle the octave.
  const every = Math.max(1, Math.ceil(centres.length / SONG_TEMPO_WINDOWS));
  const sample = centres.filter((_, i) => i % every === 0);
  for (const { t, half } of sample) {
    for (let s = 0; s < steps; s++) {
      const period = 60 / (minBpm + s * COARSE_BPM_STEP);
      let best = 0;
      for (let offset = -period / 2; offset < period / 2; offset += COARSE_PHASE_STEP) {
        best = Math.max(best, gridContrast(odf, rate, t, half, period, offset, true));
      }
      curve[s] += best;
    }
  }
  let songBpm = minBpm;
  let bestScore = -Infinity;
  for (let s = 0; s < steps; s++) {
    const bpm = minBpm + s * COARSE_BPM_STEP;
    const prior = Math.exp(-0.5 * Math.log2(bpm / PRIOR_CENTRE) ** 2);
    if (curve[s] * prior > bestScore) {
      bestScore = curve[s] * prior;
      songBpm = bpm;
    }
  }

  // Pass 2: each window within ±8% of the song's tempo, coarse then fine.
  const lo = Math.max(minBpm, songBpm * (1 - LOCAL_SPAN));
  const hi = Math.min(maxBpm, songBpm * (1 + LOCAL_SPAN));
  const windows: TempoWindow[] = centres.map(({ t, half }) => {
    const coarse = bestFit(odf, rate, t, half, lo, hi, MID_BPM_STEP, (p) => [-p / 2, p / 2, COARSE_PHASE_STEP]);
    const fine = bestFit(
      odf, rate, t, half,
      Math.max(lo, coarse.bpm - 0.3), Math.min(hi, coarse.bpm + 0.3), BPM_STEP,
      () => [coarse.offset - 0.012, coarse.offset + 0.0121, PHASE_STEP],
    );
    return { t, bpm: fine.bpm, strength: fine.score, kept: fine.score > MIN_CLARITY * level };
  });

  // Drop the weakest windows, then smooth the tempo of the rest (median of 3, then 1-2-1).
  const ranked = windows.filter((w) => w.kept).sort((a, b) => a.strength - b.strength);
  for (const w of ranked.slice(0, Math.floor(ranked.length * DROP_WEAKEST))) w.kept = false;
  const kept = windows.filter((w) => w.kept);
  const medians = kept.map((_, i) => median(kept.slice(Math.max(0, i - 1), i + 2).map((w) => w.bpm)));
  const smoothed = medians.map((v, i) => {
    const a = medians[i - 1] ?? v;
    const b = medians[i + 1] ?? v;
    return (a + 2 * v + b) / 4;
  });
  const points = kept.map((w, i) => ({ t: w.t, bpm: smoothed[i] }));

  const bpmAt = (t: number): number => {
    if (points.length === 0) return songBpm;
    if (t <= points[0].t) return points[0].bpm;
    for (let i = 1; i < points.length; i++) {
      if (t <= points[i].t) {
        const a = points[i - 1];
        const b = points[i];
        return a.bpm + ((b.bpm - a.bpm) * (t - a.t)) / (b.t - a.t);
      }
    }
    return points[points.length - 1].bpm;
  };

  return { windows, songBpm, bpmAt };
}
