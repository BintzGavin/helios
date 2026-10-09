/**
 * The beat map: everything `helios analyze` measures in a song, in one JSON-ready object.
 */
import path from 'path';
import { guardOffbeat, snapBeats, snapCandidates, tempoCurve, trackBeats } from './beats.js';
import { ANALYSIS_SAMPLE_RATE, decodeAudio } from './decode.js';
import { findDownbeats } from './downbeats.js';
import { BandEnvelope } from './envelope.js';
import { FeatureExtractor, type Features } from './features.js';
import { findClimbs, findImpacts, findRisers, type Loudness } from './hits.js';
import { beatStrength, drumOnsets } from './onsets.js';
import { findSections } from './sections.js';
import { gaussianSmooth, median, round } from './stats.js';
import { fitTempo } from './tempo.js';

export const DEFAULT_FPS = 30;
export const DEFAULT_TEMPO_RANGE: [number, number] = [70, 180];
export const DEFAULT_BEATS_PER_BAR = 4;
/** Shortest song worth analysing: a few beats at the slowest tempo. */
const MIN_DURATION = 2;
/** Fewer onsets than this in the whole song is not a beat. */
const MIN_ONSETS = 4;
/** Beats at the very start or end where the mix is this low (0–1 scale, ≈46 dB down) are silence. */
const SILENT_LEVEL = 0.05;

export interface AnalyzeOptions {
  /** Envelope frames per second. */
  fps?: number;
  /** BPM range to search: pins half or double time. */
  tempoRange?: [number, number];
  beatsPerBar?: number;
}

export interface BeatMap {
  version: 1;
  source: string;
  duration: number;
  bpm: number;
  tempo: { t: number; bpm: number }[];
  beatsPerBar: number;
  beats: number[];
  downbeats: number[];
  downbeatMethod: 'kick' | 'harmony';
  sections: { t0: number; t1: number; energy: number }[];
  hits: { t: number; score: number }[];
  onsets: { kick: number[]; snare: number[]; hat: number[] };
  risers: { t0: number; t1: number }[];
  envelope: { fps: number; level: number[]; low: number[]; mid: number[]; high: number[] };
}

/** Decodes an audio file with ffmpeg and analyses it. */
export async function analyzeAudioFile(file: string, options: AnalyzeOptions = {}): Promise<BeatMap> {
  checkOptions(options);
  const extractor = new FeatureExtractor(ANALYSIS_SAMPLE_RATE);
  const samples = await decodeAudio(file, (chunk) => extractor.push(chunk));
  if (samples === 0) throw new Error(`${path.basename(file)} decoded to no audio.`);
  return analyzeFeatures(extractor.finish(), path.basename(file), options);
}

/** Analyses mono samples already in memory. */
export function analyzeSamples(samples: Float32Array, sampleRate: number, source: string, options: AnalyzeOptions = {}): BeatMap {
  checkOptions(options);
  const extractor = new FeatureExtractor(sampleRate);
  extractor.push(samples);
  return analyzeFeatures(extractor.finish(), source, options);
}

function checkOptions(options: AnalyzeOptions): void {
  const fps = options.fps ?? DEFAULT_FPS;
  if (!Number.isFinite(fps) || fps <= 0 || fps > 1000) {
    throw new Error(`--fps must be a number of frames per second between 0 and 1000 (got ${fps})`);
  }
  const [lo, hi] = options.tempoRange ?? DEFAULT_TEMPO_RANGE;
  if (!(lo >= 20 && hi <= 400 && hi > lo)) {
    throw new Error(`--tempo-range must be min:max BPM with 20 ≤ min < max ≤ 400 (got ${lo}:${hi})`);
  }
  const perBar = options.beatsPerBar ?? DEFAULT_BEATS_PER_BAR;
  if (!Number.isInteger(perBar) || perBar < 1 || perBar > 16) {
    throw new Error(`--beats-per-bar must be a whole number from 1 to 16 (got ${perBar})`);
  }
}

export function analyzeFeatures(features: Features, source: string, options: AnalyzeOptions = {}): BeatMap {
  const fps = options.fps ?? DEFAULT_FPS;
  const range = options.tempoRange ?? DEFAULT_TEMPO_RANGE;
  const beatsPerBar = options.beatsPerBar ?? DEFAULT_BEATS_PER_BAR;
  const { duration, frameRate } = features;

  if (duration < MIN_DURATION) {
    throw new Error(`${source} is ${duration.toFixed(2)} s long; a beat map needs at least ${MIN_DURATION} s of audio.`);
  }
  let loudest = 0;
  for (const p of features.power.all) loudest = Math.max(loudest, p);
  if (loudest < 1e-9) throw new Error(`${source} is silent.`);

  // Loudness first: the beat tracker uses the mix level to trim silence.
  const { power } = features;
  const upper = new Float32Array(power.mid.length);
  for (let i = 0; i < upper.length; i++) upper[i] = power.mid[i] + power.high[i];
  const loud: Loudness = {
    level: new BandEnvelope(power.all, frameRate),
    low: new BandEnvelope(power.low, frameRate),
    kick: new BandEnvelope(power.kick, frameRate),
    mid: new BandEnvelope(power.mid, frameRate),
    high: new BandEnvelope(power.high, frameRate),
    upper: new BandEnvelope(upper, frameRate),
  };

  // Beats: local tempo, beats along it, the off-beat guard, then snapping to real onsets.
  const odf = beatStrength(features);
  const fit = fitTempo(gaussianSmooth(odf, 1.5), frameRate, duration, range);
  if (!fit.windows.some((w) => w.kept)) {
    throw new Error(`no steady beat found in ${source}. If it has one, pin its tempo with --tempo-range min:max.`);
  }
  const onsets = drumOnsets(features);
  if (onsets.kick.length + onsets.snare.length + onsets.hat.length < MIN_ONSETS) {
    throw new Error(`no steady beat found in ${source}: it has almost no drum or note onsets to follow.`);
  }
  const tracked = guardOffbeat(trackBeats(odf, frameRate, fit.bpmAt), onsets);
  let beats = snapBeats(tracked, snapCandidates(onsets)).filter((b) => b >= 0 && b < duration);
  const silent = (t: number) => loud.level.level(t - 0.1, t + 0.1) < SILENT_LEVEL;
  while (beats.length > 0 && silent(beats[0])) beats.shift();
  while (beats.length > 0 && silent(beats[beats.length - 1])) beats.pop();
  if (beats.length < 2) {
    throw new Error(`no steady beat found in ${source}. If it has one, pin its tempo with --tempo-range min:max.`);
  }

  const tempo = tempoCurve(beats, duration);
  const { downbeats, method } = findDownbeats(beats, features, beatsPerBar);

  const onsetTimes = [...onsets.kick, ...onsets.snare].map((o) => o.t).sort((a, b) => a - b);
  const climbs = findClimbs(loud, duration);
  const hits = findImpacts(loud, duration, downbeats, onsetTimes, climbs);
  const risers = findRisers(climbs, hits);
  const drumTimes = [...onsets.kick, ...onsets.snare, ...onsets.hat].map((o) => o.t).sort((a, b) => a - b);
  const sections = findSections(downbeats, duration, loud, features, hits, drumTimes, beatsPerBar);

  const times = (list: number[]) => list.map((t) => round(t, 3));
  const values = (list: Float32Array) => Array.from(list, (v) => round(v, 3));
  return {
    version: 1,
    source,
    duration: round(duration, 3),
    bpm: round(median(tempo.map((p) => p.bpm)), 2),
    tempo: tempo.map((p) => ({ t: round(p.t, 3), bpm: round(p.bpm, 2) })),
    beatsPerBar,
    beats: times(beats),
    downbeats: times(downbeats),
    downbeatMethod: method,
    sections: sections.map((s) => ({ t0: round(s.t0, 3), t1: round(s.t1, 3), energy: round(s.energy, 2) })),
    hits: hits.map((h) => ({ t: round(h.t, 3), score: round(h.score, 2) })),
    onsets: {
      kick: times(onsets.kick.map((o) => o.t)),
      snare: times(onsets.snare.map((o) => o.t)),
      hat: times(onsets.hat.map((o) => o.t)),
    },
    risers: risers.map((r) => ({ t0: round(r.t0, 3), t1: round(r.t1, 3) })),
    envelope: {
      fps,
      level: values(loud.level.sample(fps, duration)),
      low: values(loud.low.sample(fps, duration)),
      mid: values(loud.mid.sample(fps, duration)),
      high: values(loud.high.sample(fps, duration)),
    },
  };
}

/**
 * JSON with one top-level field per line and each list on one line, so the file reads at a
 * glance (`head`) without spending a line per number.
 */
export function formatBeatMap(map: BeatMap): string {
  const lines = Object.entries(map).map(([key, value]) => {
    if (key === 'envelope' || key === 'onsets') {
      const inner = Object.entries(value as object).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
      return `  ${JSON.stringify(key)}: {\n${inner.join(',\n')}\n  }`;
    }
    return `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  });
  return `{\n${lines.join(',\n')}\n}\n`;
}
