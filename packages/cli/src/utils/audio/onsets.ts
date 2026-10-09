import type { DrumBand, Features } from './features.js';
import { nearest, percentile } from './stats.js';

export interface Onset {
  /** Seconds. */
  t: number;
  /** Peak spectral flux of the onset (mean rise in log magnitude per bin). */
  strength: number;
}

/** Snares and hats closer than this to a kick are the kick itself: a broadband kick fires in every band. */
export const KICK_SHADOW = 0.045;

/** How much each drum band counts towards the beat: the beat is the kick, not the off-beat hats. */
export const BEAT_WEIGHTS: Record<DrumBand, number> = { kick: 1, snare: 0.6, hat: 0.3 };

/** An onset must get within this many dB of the band's loud level (99th percentile of frame power). */
const GATE_DB = 20;
/** Smallest flux peak worth looking at (mean log-magnitude rise per bin). */
const MIN_FLUX = 0.05;
/** An onset's flux must reach this fraction of the band's typical hit (90th percentile of its peaks). */
const RELATIVE_FLUX = 0.3;
/** A snare-band onset whose 6–16 kHz power rises more than 4× (6 dB) its 150 Hz–5 kHz rise is a hat. */
const HAT_OVER_SNARE = 4;

/**
 * Frames that are the largest within ±maxWin seconds, rise `delta` above the mean of the
 * surrounding [-preAvg, +postAvg] seconds, and come at least `wait` seconds after the last one.
 */
export function pickPeaks(
  x: Float32Array,
  frameRate: number,
  opts: { delta: number; maxWin?: number; preAvg?: number; postAvg?: number; wait?: number },
): number[] {
  const maxWin = Math.max(1, Math.round((opts.maxWin ?? 0.03) * frameRate));
  const preAvg = Math.max(1, Math.round((opts.preAvg ?? 0.1) * frameRate));
  const postAvg = Math.max(1, Math.round((opts.postAvg ?? 0.07) * frameRate));
  const wait = Math.round((opts.wait ?? 0.04) * frameRate);

  const prefix = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) prefix[i + 1] = prefix[i] + x[i];

  const peaks: number[] = [];
  let last = -Infinity;
  for (let i = 1; i < x.length - 1; i++) {
    const v = x[i];
    if (v <= opts.delta || v < x[i - 1] || v < x[i + 1]) continue;
    let isMax = true;
    for (let j = Math.max(0, i - maxWin); j <= Math.min(x.length - 1, i + maxWin); j++) {
      if (x[j] > v) {
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;
    const a = Math.max(0, i - preAvg);
    const b = Math.min(x.length, i + postAvg + 1);
    const localMean = (prefix[b] - prefix[a]) / (b - a);
    if (v < localMean + opts.delta) continue;
    if (i - last < wait) continue;
    peaks.push(i);
    last = i;
  }
  return peaks;
}

/**
 * Onset timing compares a band's energy just after a point with the energy just before it, over
 * spans (seconds) that cover a couple of periods of the band's lowest notes, so a held chord's
 * ripple doesn't look like an attack.
 */
const ATTACK_SPANS: Record<DrumBand, { after: number; before: number }> = {
  kick: { after: 0.012, before: 0.03 },
  snare: { after: 0.008, before: 0.02 },
  hat: { after: 0.004, before: 0.012 },
};

/**
 * Moves an onset found on the STFT to its attack in the band's fine envelope: the point where
 * the energy just after it most exceeds the energy just before it. Spectral flux fires as an
 * attack enters a 46 ms frame, so it can be ~20 ms early; this lands within a couple of ms of
 * where the sound starts, even over a held chord in the same band.
 */
export function refineOnset(
  fine: Float32Array,
  fineRate: number,
  t: number,
  spans: { after: number; before: number } = ATTACK_SPANS.snare,
): number {
  const after = Math.max(1, Math.round(spans.after * fineRate));
  const before = Math.max(1, Math.round(spans.before * fineRate));
  const from = Math.max(before, Math.round((t - 0.012) * fineRate));
  const to = Math.min(fine.length - after, Math.round((t + 0.035) * fineRate));
  if (to <= from) return t;

  const prefix = new Float64Array(to - from + before + after + 1);
  const base = from - before;
  let peak = 0;
  for (let j = base; j < to + after; j++) {
    prefix[j - base + 1] = prefix[j - base] + fine[j];
    peak = Math.max(peak, fine[j]);
  }
  // Keeps silence before an attack from dividing by zero; far below anything audible in the band.
  const floor = peak * 1e-4 + 1e-12;
  const ratio = (j: number) => {
    const a = (prefix[j - base + after] - prefix[j - base]) / after;
    const b = (prefix[j - base] - prefix[j - base - before]) / before;
    return (a + floor) / (b + floor);
  };

  let best = from;
  let bestRatio = -Infinity;
  for (let j = from; j <= to; j++) {
    const r = ratio(j);
    if (r > bestRatio) {
      bestRatio = r;
      best = j;
    }
  }
  if (bestRatio <= 1) return t;
  // Block j starts at sample j·FINE_BLOCK.
  return best / fineRate;
}

/**
 * Kick, snare and hat onsets: peaks of each band's spectral flux, timed on the fine envelope.
 * Snares and hats that coincide with a kick are the kick, and a "snare" whose rise is mostly
 * above 6 kHz is a hat leaking into the snare band.
 */
export function drumOnsets(features: Features): Record<DrumBand, Onset[]> {
  const { frameRate, fineRate } = features;
  const look = Math.round(0.05 * frameRate);
  /** How much a band's power climbs from the 50 ms before frame i to the 50 ms after it. */
  const rise = (power: Float32Array, i: number) => {
    let peak = 0;
    let floor = Infinity;
    for (let j = i; j <= Math.min(power.length - 1, i + look); j++) peak = Math.max(peak, power[j]);
    for (let j = Math.max(0, i - look); j < i; j++) floor = Math.min(floor, power[j]);
    return Math.max(0, peak - (Number.isFinite(floor) ? floor : 0));
  };

  const result = {} as Record<DrumBand, Onset[]>;
  for (const band of ['kick', 'snare', 'hat'] as DrumBand[]) {
    const flux = features.flux[band];
    const power = features.power[band];
    const gate = percentile(power, 0.99) * 10 ** (-GATE_DB / 10);

    const peaks = pickPeaks(flux, frameRate, { delta: MIN_FLUX }).filter((i) => {
      let level = 0;
      for (let j = i; j <= Math.min(power.length - 1, i + look); j++) level = Math.max(level, power[j]);
      if (level < gate) return false;
      return band !== 'snare' || rise(features.power.hat, i) <= HAT_OVER_SNARE * rise(power, i);
    });
    // Leakage from the neighbouring bands makes small peaks: keep the ones within reach of the
    // band's typical hit.
    const typical = percentile(peaks.map((i) => flux[i]), 0.9);
    result[band] = peaks
      .filter((i) => flux[i] >= RELATIVE_FLUX * typical)
      .map((i) => ({ t: refineOnset(features.fine[band], fineRate, i / frameRate, ATTACK_SPANS[band]), strength: flux[i] }));
  }

  const kicks = result.kick.map((o) => o.t);
  const nearKick = (t: number) => nearest(kicks, t, KICK_SHADOW) !== undefined;
  result.snare = result.snare.filter((o) => !nearKick(o.t));
  result.hat = result.hat.filter((o) => !nearKick(o.t));
  return result;
}

/** The onset strength the beat tracker follows: the drum bands' flux, weighted towards the kick. */
export function beatStrength(features: Features): Float32Array {
  const { kick, snare, hat } = features.flux;
  const out = new Float32Array(kick.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = BEAT_WEIGHTS.kick * kick[i] + BEAT_WEIGHTS.snare * snare[i] + BEAT_WEIGHTS.hat * hat[i];
  }
  return out;
}
