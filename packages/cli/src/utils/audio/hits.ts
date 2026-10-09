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
  /** 30–150 Hz: the kick, the sub and the bass's fundamentals, below the chords. */
  kick: BandEnvelope;
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

/** A steady climb in a band above the bass: a riser or a swell, wherever it lands. */
export interface Climb {
  t0: number;
  /** Where the climb stops: up to RISER_WINDOW after what it lands on. */
  t1: number;
  /** How much it climbed, 0–1. */
  rise: number;
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
/**
 * A riser fills the window before a drop, so the drop's own jump comes out small. Where a riser
 * lands on a jump of at least MIN_LANDING, the climb counts too (its rise, at most
 * MAX_RISER_BONUS), and so does the kick and sub band (30–150 Hz) at KICK_WEIGHT: an impact's
 * boom lands under the riser's peak. Elsewhere the kick band is left out: a half-time kick
 * every two seconds would look like a jump each time.
 */
const KICK_WEIGHT = 0.7;
const MAX_RISER_BONUS = 0.25;
const MIN_LANDING = 0.1;
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
/** …that must be louder than it was 0.25 s earlier at every 50 ms step of the climb. */
const RISER_STEP = 0.25;
const CLIMB_SCAN = 0.05;

function jump(band: BandEnvelope, t: number): number {
  return band.level(t, t + NEXT) - band.level(t - PREV, t);
}

/**
 * Climbs in everything above the bass (250 Hz–16 kHz) and in the top band (4–16 kHz), where a
 * swept riser shows even over a loud pad: spans of at least 1 s where the trailing 0.5 s level
 * is louder than 0.25 s earlier at every 50 ms, climbing at least 0.1 in all. A step (drums
 * coming in) climbs for only the window's length plus the step, so it doesn't count.
 */
export function findClimbs(loud: Loudness, duration: number): Climb[] {
  const climbs: Climb[] = [];
  for (const band of [loud.upper, loud.high]) {
    const trailing = (t: number) => band.level(t - RISER_WINDOW, t);
    let start = -1;
    const first = Math.ceil((RISER_WINDOW + RISER_STEP) / CLIMB_SCAN);
    const last = Math.floor(duration / CLIMB_SCAN);
    for (let i = first; i <= last + 1; i++) {
      const t = i * CLIMB_SCAN;
      const rising = i <= last && trailing(t) > trailing(t - RISER_STEP) + 0.002;
      if (rising && start < 0) start = t;
      if (rising || start < 0) continue;
      // The climb started where the first rising point was compared from, and ended a step ago.
      const t0 = start - RISER_STEP;
      const t1 = t - CLIMB_SCAN;
      const rise = trailing(t1) - trailing(t0);
      if (t1 - t0 >= MIN_RISER + RISER_STEP && rise >= MIN_RISE) climbs.push({ t0, t1, rise });
      start = -1;
    }
  }
  return climbs.sort((a, b) => a.t0 - b.t0);
}

/** Whether a hit at t is what the climb lands on: the trailing window peaks up to 0.5 s after it. */
function landsOn(climb: Climb, t: number): boolean {
  return t >= climb.t1 - RISER_WINDOW - 0.1 && t <= climb.t1 + 0.05;
}

/**
 * Impacts: where the next 0.6 s jumps over the previous 1.5 s in the mix, the drums (high band)
 * or the bass (low band). Score = max(mix, 0.9 × drums, 0.7 × bass); where a riser lands, also
 * 0.7 × the kick and sub band's jump, plus the riser's climb (at most 0.25). Kept when ≥ 0.22,
 * snapped to a downbeat within 0.65 s (else to an onset within 80 ms), and merged within 2 s. Nothing inside a riser is a hit until its last 0.6 s, so a swell's rising edge
 * isn't mistaken for what it lands on. The start of the song is not a hit (both spans must fit
 * inside the audio), and neither is a jump that leaves the mix quiet (a lone kick in a quiet
 * outro).
 */
export function findImpacts(
  loud: Loudness,
  duration: number,
  downbeats: number[],
  onsets: number[],
  climbs: Climb[] = [],
): Hit[] {
  const first = Math.ceil(PREV / SCAN_STEP);
  const last = Math.floor((duration - NEXT) / SCAN_STEP);
  const score = new Float64Array(Math.max(0, last + 1));
  for (let i = first; i <= last; i++) {
    const t = i * SCAN_STEP;
    if (loud.level.level(t, t + NEXT) < LOUD_ENOUGH) continue;
    if (climbs.some((c) => t > c.t0 && t < c.t1 - RISER_WINDOW - 0.1)) continue;
    let base = Math.max(jump(loud.level, t), DRUM_WEIGHT * jump(loud.high, t), BASS_WEIGHT * jump(loud.low, t));
    const landing = climbs.filter((c) => landsOn(c, t));
    if (landing.length > 0) {
      base = Math.max(base, KICK_WEIGHT * jump(loud.kick, t));
      const riser = Math.min(MAX_RISER_BONUS, Math.max(...landing.map((c) => c.rise)));
      if (base >= MIN_LANDING) base += riser;
    }
    score[i] = base;
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

/** Risers: climbs of at least 1 s that land on a hit, from where the earliest one starts. */
export function findRisers(climbs: Climb[], hits: Hit[]): Riser[] {
  const risers: Riser[] = [];
  for (const hit of hits) {
    const into = climbs.filter((c) => landsOn(c, hit.t) && c.t0 < hit.t - MIN_RISER);
    if (into.length > 0) risers.push({ t0: Math.min(...into.map((c) => c.t0)), t1: hit.t });
  }
  return risers;
}
