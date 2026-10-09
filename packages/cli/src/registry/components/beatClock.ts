/**
 * beat-clock: musical time for a Helios page, read from `helios analyze` output.
 *
 * `helios analyze song.mp3` writes `song.beats.json`: beats on a tempo that drifts, downbeats,
 * kick/snare/hat onsets, the big hits, sections and loudness envelopes. The clock answers
 * questions about that file at any time `t` (seconds of song time). Every answer is a pure
 * function of `t`: lookups are binary searches over lists sorted once, and nothing is
 * remembered between frames, so frames render the same in any order and on any worker.
 *
 *   import { loadBeats } from './beatClock';
 *
 *   const beats = loadBeats('song.beats.json');
 *   const shots = [drawCity, drawSea, drawSky];
 *
 *   window.renderAt = async (t) => {
 *     const clock = await beats;
 *     const bar = clock.bar(t);
 *     const shot = shots[Math.max(bar.index, 0) % shots.length];       // cut on every downbeat
 *     const punch = 1 + 0.03 * clock.pulse(t, 'kick') * clock.level(t, 'low'); // punch on kicks
 *     ctx.setTransform(punch, 0, 0, punch, (W - W * punch) / 2, (H - H * punch) / 2);
 *     shot(ctx, t, bar.phase);
 *   };
 *
 * `beat` and `bar` take an optional object to write into, so a page can query them every
 * frame without allocating.
 */

export interface Hit {
  t: number;
  /** How big the moment is, 0–1. */
  score: number;
}

export interface Section {
  t0: number;
  t1: number;
  /** Average loudness of the section, 0–1. */
  energy: number;
}

/** The JSON `helios analyze` writes. Only `beats` is required. */
export interface BeatsData {
  version?: number;
  source?: string;
  duration?: number;
  bpm?: number;
  tempo?: { t: number; bpm: number }[];
  beatsPerBar?: number;
  beats: number[];
  downbeats?: number[];
  downbeatMethod?: string;
  sections?: Section[];
  hits?: Hit[];
  onsets?: { kick?: number[]; snare?: number[]; hat?: number[] };
  risers?: { t0: number; t1: number }[];
  envelope?: { fps: number; level?: number[]; low?: number[]; mid?: number[]; high?: number[] };
}

/** A list of events by name, or your own sorted list of times in seconds. */
export type Events = 'beat' | 'downbeat' | 'kick' | 'snare' | 'hat' | 'hit' | readonly number[];

export type Band = 'level' | 'low' | 'mid' | 'high';

export interface BeatPosition {
  /** The beat at or before `t`, counting from 0. -1 before the first beat. */
  index: number;
  /** How far through that beat `t` is, 0 on the beat to just under 1. */
  phase: number;
  /** That beat's length in seconds (the local tempo is 60 / length BPM). */
  length: number;
}

export interface BarPosition {
  /** The bar, counting from 0 at the first downbeat. Bars before it count back: -1, -2, … */
  index: number;
  /** How far through the bar `t` is, 0 on the downbeat to just under 1. Moves evenly per beat. */
  phase: number;
  /** The beat within the bar, 0 on the downbeat. */
  beat: number;
}

export interface BeatClock {
  /** The data the clock was made from. */
  readonly data: BeatsData;
  /** Song length in seconds (`data.duration`, or the last beat). */
  readonly duration: number;
  readonly beatsPerBar: number;
  /** Event times in seconds, sorted. */
  readonly beats: readonly number[];
  readonly downbeats: readonly number[];
  readonly kicks: readonly number[];
  readonly snares: readonly number[];
  readonly hats: readonly number[];
  /** The big moments (impacts, drops), sorted by time. */
  readonly hits: readonly Hit[];
  /**
   * The beat at `t`. Past the last beat the grid keeps going at the song's closing tempo, so
   * an outro or a title card after the music still moves on the beat.
   */
  beat(t: number, out?: BeatPosition): BeatPosition;
  /** The bar at `t`, from the downbeats. Past the last one, bars of `beatsPerBar` beats. */
  bar(t: number, out?: BarPosition): BarPosition;
  /** Seconds since the latest event at or before `t`; Infinity if there is none. */
  since(t: number, events?: Events): number;
  /** Seconds until the first event after `t`; Infinity if there is none. */
  next(t: number, events?: Events): number;
  /**
   * 1 on an event, falling by half every `halfLife` seconds after it; 0 before the first.
   * Use it for anything that should kick on a sound and die away.
   */
  pulse(t: number, events?: Events, halfLife?: number): number;
  /** A loudness envelope at `t`, 0–1, interpolated between its frames. */
  level(t: number, band?: Band): number;
  /**
   * The hits after `t0`, up to and including `t1`. `hitsBetween(t - 1 / fps, t)` gives each
   * hit to exactly one frame: the first one at or after it.
   */
  hitsBetween(t0: number, t1: number): readonly Hit[];
  /** The section `t` falls in, with its index, or null outside every section. */
  section(t: number): (Section & { index: number }) | null;
}

const NO_HITS: readonly Hit[] = Object.freeze([]);
// In beats: absorbs rounding when `t` sits exactly on an extrapolated beat.
const EPSILON = 1e-9;

/** Fetches the JSON that `helios analyze` wrote and makes a clock from it. */
export async function loadBeats(url: string | URL): Promise<BeatClock> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load beats from ${url} (HTTP ${response.status}). Run "helios analyze <audio>" and serve the .beats.json file next to the page.`);
  }
  return createBeatClock(await response.json());
}

export function createBeatClock(data: BeatsData): BeatClock {
  if (!data || !Array.isArray(data.beats)) {
    throw new Error('The beats data has no "beats" list. Pass the JSON that "helios analyze <audio>" writes.');
  }

  const beats = sortedTimes(data.beats);
  const beatsPerBar = data.beatsPerBar && data.beatsPerBar > 0 ? Math.round(data.beatsPerBar) : 4;
  const downbeats = data.downbeats && data.downbeats.length > 0
    ? sortedTimes(data.downbeats)
    : beats.filter((_, i) => i % beatsPerBar === 0);
  const kicks = sortedTimes(data.onsets?.kick);
  const snares = sortedTimes(data.onsets?.snare);
  const hats = sortedTimes(data.onsets?.hat);
  const hits = (data.hits ?? []).filter((hit) => Number.isFinite(hit.t)).sort((a, b) => a.t - b.t);
  const hitTimes = hits.map((hit) => hit.t);
  const sections = (data.sections ?? []).slice().sort((a, b) => a.t0 - b.t0).map((section, index) => ({ ...section, index }));
  const sectionStarts = sections.map((section) => section.t0);
  const envelope = data.envelope;
  const envelopeFps = envelope && envelope.fps > 0 ? envelope.fps : 30;
  const lastBeat = beats.length > 0 ? beats[beats.length - 1] : 0;
  const duration = data.duration ?? lastBeat;

  // Beat lengths before the first beat and after the last: the tempo curve's ends when there is
  // one, otherwise the average of the nearest few beats.
  const tempo = data.tempo ?? [];
  const nominal = 60 / (data.bpm && data.bpm > 0 ? data.bpm : 120);
  const fromBpm = (bpm: number | undefined, fallback: number) => (bpm && bpm > 0 ? 60 / bpm : fallback);
  const span = Math.min(8, beats.length - 1);
  const leadLength = fromBpm(tempo[0]?.bpm, span > 0 ? (beats[span] - beats[0]) / span : nominal);
  const tailLength = fromBpm(tempo[tempo.length - 1]?.bpm, span > 0 ? (lastBeat - beats[beats.length - 1 - span]) / span : nominal);

  // The beat each downbeat falls on, so bars advance in whole beats.
  const downbeatBeats = downbeats.map((time) => nearestIndex(beats, time));

  const times = (events: Events): readonly number[] => {
    if (typeof events !== 'string') return events;
    switch (events) {
      case 'beat': return beats;
      case 'downbeat': return downbeats;
      case 'kick': return kicks;
      case 'snare': return snares;
      case 'hat': return hats;
      case 'hit': return hitTimes;
    }
    throw new Error(`Unknown events "${events}". Use beat, downbeat, kick, snare, hat or hit, or pass a sorted list of times.`);
  };

  const beat = (t: number, out: BeatPosition = { index: 0, phase: 0, length: 0 }): BeatPosition => {
    const n = beats.length;
    if (n === 0) {
      out.index = -1;
      out.phase = 0;
      out.length = nominal;
      return out;
    }
    if (t < beats[0]) {
      // The pickup beat: phase rises to 1 as the first beat arrives.
      out.index = -1;
      out.length = leadLength;
      out.phase = Math.max(0, 1 - (beats[0] - t) / leadLength);
      return out;
    }
    const i = upperBound(beats, t) - 1;
    if (i < n - 1) {
      out.index = i;
      out.length = beats[i + 1] - beats[i];
      out.phase = (t - beats[i]) / out.length;
      return out;
    }
    const beatsPast = (t - lastBeat) / tailLength;
    const whole = Math.floor(beatsPast + EPSILON);
    const phase = beatsPast - whole;
    out.index = n - 1 + whole;
    out.length = tailLength;
    out.phase = phase < EPSILON ? 0 : phase;
    return out;
  };

  const scratch: BeatPosition = { index: 0, phase: 0, length: 0 };
  const bar = (t: number, out: BarPosition = { index: 0, phase: 0, beat: 0 }): BarPosition => {
    beat(t, scratch);
    const b = scratch.index;
    const last = downbeatBeats.length - 1;
    if (last < 0) {
      out.index = Math.floor(b / beatsPerBar);
      out.beat = b - out.index * beatsPerBar;
      out.phase = (out.beat + scratch.phase) / beatsPerBar;
      return out;
    }
    const k = upperBound(downbeatBeats, b) - 1;
    if (k >= 0 && k < last) {
      out.index = k;
      out.beat = b - downbeatBeats[k];
      out.phase = (out.beat + scratch.phase) / (downbeatBeats[k + 1] - downbeatBeats[k]);
      return out;
    }
    // Before the first downbeat or after the last: whole bars counted from it.
    const anchor = k < 0 ? 0 : last;
    const beatsFrom = b - downbeatBeats[anchor];
    const barsFrom = Math.floor(beatsFrom / beatsPerBar);
    out.index = anchor + barsFrom;
    out.beat = beatsFrom - barsFrom * beatsPerBar;
    out.phase = (out.beat + scratch.phase) / beatsPerBar;
    return out;
  };

  const since = (t: number, events: Events = 'beat'): number => {
    const list = times(events);
    const i = upperBound(list, t) - 1;
    return i < 0 ? Infinity : t - list[i];
  };

  const next = (t: number, events: Events = 'beat'): number => {
    const list = times(events);
    const i = upperBound(list, t);
    return i < list.length ? list[i] - t : Infinity;
  };

  const pulse = (t: number, events: Events = 'beat', halfLife = 0.1): number => {
    const elapsed = since(t, events);
    if (elapsed === Infinity) return 0;
    if (halfLife <= 0) return elapsed === 0 ? 1 : 0;
    return Math.pow(2, -elapsed / halfLife);
  };

  const level = (t: number, band: Band = 'level'): number => {
    const values = envelope?.[band];
    if (!values || values.length === 0) return 0;
    const x = t * envelopeFps;
    const last = values.length - 1;
    if (x <= 0) return values[0];
    if (x >= last) return values[last];
    const i = Math.floor(x);
    return values[i] + (values[i + 1] - values[i]) * (x - i);
  };

  const hitsBetween = (t0: number, t1: number): readonly Hit[] => {
    const from = upperBound(hitTimes, t0);
    const to = upperBound(hitTimes, t1);
    return to > from ? hits.slice(from, to) : NO_HITS;
  };

  const section = (t: number) => {
    const i = upperBound(sectionStarts, t) - 1;
    return i >= 0 && t < sections[i].t1 ? sections[i] : null;
  };

  return { data, duration, beatsPerBar, beats, downbeats, kicks, snares, hats, hits, beat, bar, since, next, pulse, level, hitsBetween, section };
}

function sortedTimes(list: readonly number[] | undefined): number[] {
  return (list ?? []).filter(Number.isFinite).sort((a, b) => a - b);
}

/** The first index whose value is greater than `value` (list sorted ascending). */
function upperBound(list: readonly number[], value: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (list[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function nearestIndex(list: readonly number[], value: number): number {
  const i = upperBound(list, value);
  if (i === 0) return 0;
  if (i === list.length) return list.length - 1;
  return value - list[i - 1] <= list[i] - value ? i - 1 : i;
}
