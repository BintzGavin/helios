/**
 * Sections: a heuristic segmentation on bar lines. A boundary goes where the four bars after a
 * downbeat differ most from the four bars before it, in loudness per band, in harmony and in
 * whether the drums play, with a boost where a hit lands. It finds where the track changes; it
 * does not name the sections.
 */
import type { Features } from './features.js';
import type { Hit, Loudness } from './hits.js';
import { mean, std } from './stats.js';

export interface Section {
  t0: number;
  t1: number;
  /** Loudness of the mix over the section, 0–1 (the envelope scale). */
  energy: number;
}

/** Bars compared either side of a candidate boundary. */
const CONTEXT_BARS = 4;
/** Shortest section, in bars… */
const MIN_SECTION_BARS = 4;
/** …except the first and last, which can be an intro or outro this short. */
const EDGE_SECTION_BARS = 2;
/** Weight of the harmony change against the loudness change. */
const HARMONY_WEIGHT = 0.5;
/** Weight of a hit (its score) landing on the boundary. */
const HIT_WEIGHT = 0.5;
/**
 * Weight of the drums coming in or dropping out: the change in the share of bars with drums
 * (a bar has them in full with at least one drum onset per beat). A break where every drum
 * stops is a section even when the pad keeps the loudness up.
 */
const DRUM_WEIGHT = 0.5;
/** Drums play in a bar with at least this share, and are out below DRUMS_OUT… */
const DRUMS_IN = 0.5;
const DRUMS_OUT = 0.25;
/** …and switching for this many whole bars either side marks a boundary outright. */
const DRUM_SWITCH_BARS = 2;
/** A boundary needs novelty of at least this, and above the song's mean + 1 standard deviation. */
const MIN_NOVELTY = 0.06;

export function findSections(
  downbeats: number[],
  duration: number,
  loud: Loudness,
  features: Features,
  hits: Hit[],
  drumOnsets: number[] = [],
  beatsPerBar = 4,
): Section[] {
  const energyOf = (t0: number, t1: number) => loud.level.level(t0, t1);
  const whole = (): Section[] => [{ t0: 0, t1: duration, energy: energyOf(0, duration) }];
  const bars = downbeats.length;
  if (bars < 2 * MIN_SECTION_BARS) return whole();

  // Bar features: mean loudness per band, and mean chroma.
  const barLength = mean(downbeats.slice(1).map((d, i) => d - downbeats[i]));
  const bands = [loud.level, loud.low, loud.mid, loud.high];
  const barEnd = (k: number) => Math.min(duration, downbeats[k + 1] ?? downbeats[k] + barLength);
  const loudness = downbeats.map((d, k) => bands.map((band) => band.level(d, barEnd(k))));
  const chroma = downbeats.map((d, k) => {
    const v = new Float64Array(12);
    const from = Math.max(0, Math.round(d * features.frameRate));
    const to = Math.min(features.frames, Math.round(barEnd(k) * features.frameRate));
    for (let f = from; f < to; f++) for (let c = 0; c < 12; c++) v[c] += features.chroma[f * 12 + c];
    return v;
  });

  // Drums per bar: onsets (kick, snare, hat) per beat, at most 1. Onsets a hair before the bar
  // line count in the bar they start.
  const drums = downbeats.map((d, k) => {
    const n = drumOnsets.filter((t) => t >= d - 0.03 && t < barEnd(k) - 0.03).length;
    return [Math.min(1, n / beatsPerBar)];
  });

  const average = (rows: ArrayLike<number>[], from: number, to: number) => {
    const width = rows[0].length;
    const out = new Float64Array(width);
    for (let k = from; k < to; k++) for (let c = 0; c < width; c++) out[c] += rows[k][c] / (to - from);
    return out;
  };
  const hitScore = new Float64Array(bars);
  for (const hit of hits) {
    const k = downbeats.indexOf(hit.t);
    if (k >= 0) hitScore[k] = Math.max(hitScore[k], hit.score);
  }

  const novelty = new Float64Array(bars);
  for (let k = EDGE_SECTION_BARS; k <= bars - EDGE_SECTION_BARS; k++) {
    const span = Math.min(CONTEXT_BARS, k, bars - k);
    const before = average(loudness, k - span, k);
    const after = average(loudness, k, k + span);
    let change = 0;
    for (let c = 0; c < before.length; c++) change += Math.abs(after[c] - before[c]) / before.length;
    const ca = average(chroma, k - span, k);
    const cb = average(chroma, k, k + span);
    let dot = 0, na = 0, nb = 0;
    for (let c = 0; c < 12; c++) {
      dot += ca[c] * cb[c];
      na += ca[c] * ca[c];
      nb += cb[c] * cb[c];
    }
    const harmony = na > 0 && nb > 0 ? 1 - dot / Math.sqrt(na * nb) : 0;
    const drumChange = Math.abs(average(drums, k, k + span)[0] - average(drums, k - span, k)[0]);
    novelty[k] = change + HARMONY_WEIGHT * harmony + DRUM_WEIGHT * drumChange + HIT_WEIGHT * hitScore[k];
  }

  // Drums starting or stopping for whole bars, and hits on a bar line, are boundaries outright.
  // A change in the four-bar averages smears over the bars around it, so a drop four bars after
  // the drums came in would otherwise lose the peak test to the bars between.
  const drumSwitch = (k: number) => {
    const before = drums.slice(Math.max(0, k - DRUM_SWITCH_BARS), k).map((d) => d[0]);
    const after = drums.slice(k, k + DRUM_SWITCH_BARS).map((d) => d[0]);
    const all = (list: number[], test: (v: number) => boolean) => list.length > 0 && list.every(test);
    return (all(before, (v) => v >= DRUMS_IN) && all(after, (v) => v < DRUMS_OUT))
      || (all(before, (v) => v < DRUMS_OUT) && all(after, (v) => v >= DRUMS_IN));
  };

  const threshold = Math.max(MIN_NOVELTY, mean(novelty) + std(novelty));
  const candidates: number[] = [];
  for (let k = EDGE_SECTION_BARS; k <= bars - EDGE_SECTION_BARS; k++) {
    if (novelty[k] < MIN_NOVELTY) continue;
    if (hitScore[k] > 0 || drumSwitch(k)) {
      candidates.push(k);
      continue;
    }
    if (novelty[k] < threshold) continue;
    let isPeak = true;
    for (let j = Math.max(0, k - 2); j <= Math.min(bars - 1, k + 2); j++) {
      if (novelty[j] > novelty[k]) isPeak = false;
    }
    if (isPeak) candidates.push(k);
  }

  // Strongest first, keeping sections at least MIN_SECTION_BARS long (an intro or outro may
  // be as short as EDGE_SECTION_BARS).
  const chosen: number[] = [];
  for (const k of candidates.sort((a, b) => novelty[b] - novelty[a])) {
    if (chosen.every((c) => Math.abs(c - k) >= MIN_SECTION_BARS)) chosen.push(k);
  }
  chosen.sort((a, b) => a - b);

  const edges = [0, ...chosen.map((k) => downbeats[k]), duration];
  const sections: Section[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    sections.push({ t0: edges[i], t1: edges[i + 1], energy: energyOf(edges[i], edges[i + 1]) });
  }
  return sections;
}
