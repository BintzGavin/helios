/**
 * Hits (impacts and drops) and the risers that lead into them.
 */
import type { BandEnvelope } from './envelope.js';
import { nearest } from './stats.js';

/**
 * Loudness of the song's bands over any span, 0–1 (dB of the mean power, so the gaps between
 * drum hits don't drag a span down).
 */
export interface Loudness {
  /** The whole mix. */
  level: BandEnvelope;
  /** 20–250 Hz: the bass (and kick). */
  low: BandEnvelope;
  /** 250 Hz–4 kHz. */
  mid: BandEnvelope;
  /** 4–16 kHz: hats, snares and cymbals, standing in for the drums. */
  high: BandEnvelope;
  /** 250 Hz–16 kHz: everything above the bass, where risers climb. */
  upper: BandEnvelope;
}

export interface Hit {
  t: number;
  score: number;
}

export interface Riser {
  t0: number;
  t1: number;
}

/** A hit compares the next 0.6 s with the previous 1.5 s… */
const NEXT = 0.6;
const PREV = 1.5;
/** …every 10 ms. */
const SCAN_STEP = 0.01;
export const MIN_HIT_SCORE = 0.22;
/** After a hit the mix is at least this loud (0–1: within 24 dB of the song's loudest moment). */
const LOUD_ENOUGH = 0.5;
/** Weights of the drum and bass jumps against the mix jump. */
const DRUM_WEIGHT = 0.9;
const BASS_WEIGHT = 0.7;
/** A hit is the strongest jump within this far either side. */
const PEAK_RADIUS = 0.3;
/** Hits snap to a downbeat this close… */
const SNAP_DOWNBEAT = 0.65;
/** …or else to an onset this close. */
const SNAP_ONSET = 0.08;
/** Of two hits closer than this, only the stronger is kept. */
const MERGE = 2;

/** A riser lasts at least this long… */
const MIN_RISER = 1;
/** …and climbs at least this much on the 0–1 scale (≈5 dB). */
const MIN_RISE = 0.1;
/** Risers are measured on a trailing 0.5 s window (which also evens out a beat under them)… */
const RISER_WINDOW = 0.5;
/** …stepping back 0.25 s at a time while it keeps falling. */
const RISER_STEP = 0.25;

function jump(band: BandEnvelope, t: number): number {
  return band.level(t, t + NEXT) - band.level(t - PREV, t);
}

/**
 * Impacts: where the next 0.6 s jumps over the previous 1.5 s in the mix, the drums (high band)
 * or the bass (low band). Score = max(mix, 0.9 × drums, 0.7 × bass), kept when ≥ 0.22, snapped
 * to a downbeat within 0.65 s (else to an onset within 80 ms), and merged within 2 s. The start
 * of the song is not a hit (both spans must fit inside the audio), and neither is a jump that
 * leaves the mix quiet (a lone kick in a quiet outro).
 */
export function findImpacts(loud: Loudness, duration: number, downbeats: number[], onsets: number[]): Hit[] {
  const first = Math.ceil(PREV / SCAN_STEP);
  const last = Math.floor((duration - NEXT) / SCAN_STEP);
  const score = new Float64Array(Math.max(0, last + 1));
  for (let i = first; i <= last; i++) {
    const t = i * SCAN_STEP;
    if (loud.level.level(t, t + NEXT) < LOUD_ENOUGH) continue;
    score[i] = Math.max(jump(loud.level, t), DRUM_WEIGHT * jump(loud.high, t), BASS_WEIGHT * jump(loud.low, t));
  }

  const radius = Math.round(PEAK_RADIUS / SCAN_STEP);
  const candidates: Hit[] = [];
  for (let i = first + radius; i <= last - radius; i++) {
    if (score[i] < MIN_HIT_SCORE) continue;
    let isPeak = true;
    for (let j = i - radius; j <= i + radius && isPeak; j++) {
      if (score[j] > score[i] || (score[j] === score[i] && j < i)) isPeak = false;
    }
    if (!isPeak) continue;
    const t = i * SCAN_STEP;
    const snapped = nearest(downbeats, t, SNAP_DOWNBEAT) ?? nearest(onsets, t, SNAP_ONSET) ?? t;
    candidates.push({ t: snapped, score: Math.min(1, score[i]) });
  }

  const kept: Hit[] = [];
  for (const hit of candidates.sort((a, b) => b.score - a.score)) {
    if (kept.every((k) => Math.abs(k.t - hit.t) >= MERGE)) kept.push(hit);
  }
  return kept.sort((a, b) => a.t - b.t);
}

/** Risers: everything above the bass climbing for at least 1 s straight into a hit. */
export function findRisers(loud: Loudness, hits: Hit[]): Riser[] {
  const trailing = (t: number) => loud.upper.level(t - RISER_WINDOW, t);
  const risers: Riser[] = [];
  for (const hit of hits) {
    // Start just before the hit, so the hit itself isn't part of the climb.
    const end = hit.t - 0.05;
    let start = end;
    while (start - RISER_STEP >= RISER_WINDOW && trailing(start - RISER_STEP) < trailing(start) - 0.002) {
      start -= RISER_STEP;
    }
    // A trailing window only starts to rise once the climb does, so `start` is within a step of it.
    if (hit.t - start >= MIN_RISER && trailing(end) - trailing(start) >= MIN_RISE) {
      risers.push({ t0: start, t1: hit.t });
    }
  }
  return risers;
}
