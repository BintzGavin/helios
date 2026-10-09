/**
 * Synthetic drums, chords and WAV writing for the analyzer tests. Every sound starts exactly
 * at its sample, so the onset times are known to the sample.
 */
import fs from 'fs';

export const SR = 44100;

/** A small deterministic noise source (LCG), so tests never depend on Math.random. */
export function noise(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };
}

export class Track {
  readonly samples: Float32Array;
  constructor(readonly duration: number) {
    this.samples = new Float32Array(Math.round(duration * SR));
  }
  add(t: number, sound: Float32Array, gain = 1): void {
    const start = Math.round(t * SR);
    const end = Math.min(this.samples.length, start + sound.length);
    for (let i = Math.max(0, start); i < end; i++) this.samples[i] += sound[i - start] * gain;
  }
  /** Scales the track so its peak is `peak` (full scale = 1). */
  normalize(peak = 0.9): this {
    let max = 0;
    for (const v of this.samples) max = Math.max(max, Math.abs(v));
    if (max > 0) for (let i = 0; i < this.samples.length; i++) this.samples[i] *= peak / max;
    return this;
  }
}

/** Renders fn over `seconds`, fading the last 10 ms so a cut-off tail doesn't click. */
function make(seconds: number, fn: (t: number, i: number) => number): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  const fade = Math.round(0.01 * SR);
  for (let i = 0; i < out.length; i++) {
    out[i] = fn(i / SR, i) * Math.min(1, (out.length - i) / fade);
  }
  return out;
}

/** A pitch-dropping sine kick with a short click. */
export function kick(): Float32Array {
  const rnd = noise(7);
  let phase = 0;
  return make(0.4, (t) => {
    const f = 48 + 90 * Math.exp(-t / 0.03);
    phase += (2 * Math.PI * f) / SR;
    const body = Math.sin(phase) * Math.exp(-t / 0.14);
    const click = t < 0.003 ? rnd() * 0.4 * (1 - t / 0.003) : 0;
    return body + click;
  });
}

/** Noise burst plus a 190 Hz body. */
export function snare(): Float32Array {
  const rnd = noise(11);
  return make(0.25, (t) => rnd() * 0.6 * Math.exp(-t / 0.06) + Math.sin(2 * Math.PI * 190 * t) * 0.4 * Math.exp(-t / 0.05));
}

/** High-passed noise with a fast decay. */
export function hat(): Float32Array {
  const rnd = noise(23);
  let prev = 0;
  return make(0.08, (t) => {
    const n = rnd();
    const hp = n - prev;
    prev = n;
    return hp * 0.5 * Math.exp(-t / 0.018);
  });
}

/** Washy crash: high-passed noise with a long decay. */
export function crash(): Float32Array {
  const rnd = noise(31);
  let prev = 0;
  return make(1.5, (t) => {
    const n = rnd();
    const hp = n - prev;
    prev = n;
    return hp * 0.6 * Math.exp(-t / 0.5);
  });
}

/** Sine tones (Hz) held for `seconds`, with 15 ms fades so they don't click. */
export function chord(freqs: number[], seconds: number, level = 0.12): Float32Array {
  return make(seconds, (t) => {
    const env = Math.min(1, t / 0.015, (seconds - t) / 0.015);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    return v * level * Math.max(0, env);
  });
}

/** White noise whose level rises exponentially from -40 dB to 0 dB over `seconds`. */
export function riser(seconds: number): Float32Array {
  const rnd = noise(41);
  return make(seconds, (t) => rnd() * 0.5 * Math.pow(10, (-40 + 40 * (t / seconds)) / 20));
}

export const NOTE = { C3: 130.81, E3: 164.81, G3: 196.0, A3: 220.0, C4: 261.63, D4: 293.66, E4: 329.63, F3: 174.61, F4: 349.23, G4: 392.0, A4: 440.0, B3: 246.94, B4: 493.88 };

/** Writes 16-bit mono PCM WAV. */
export function writeWav(file: string, samples: Float32Array, sampleRate = SR): void {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

export interface Loop {
  track: Track;
  /** Every beat, in seconds. */
  beats: number[];
  /** Beats that start a bar. */
  downbeats: number[];
}

/**
 * A drum loop on given beat times. Beat index i has bar position (i + firstPosition) % 4, so
 * firstPosition 3 makes the first beat a pickup (beat 4) and the bar start one beat later.
 */
export function drumLoop(
  beats: number[],
  duration: number,
  opts: {
    firstPosition?: number;
    /** Kick on every beat instead of 1 and 3. */
    fourOnFloor?: boolean;
    snare?: boolean;
    /** Hats on the off-beats only, at this gain (default: 8ths at 0.5). */
    offbeatHats?: number;
    /** Extra kick gain on beat 1. */
    accentOne?: number;
    /** A chord per bar from this list, cycling. */
    chords?: number[][];
  } = {},
): Loop {
  const track = new Track(duration);
  const first = opts.firstPosition ?? 0;
  const k = kick();
  const s = snare();
  const h = hat();
  const downbeats: number[] = [];
  let bar = 0;
  for (let i = 0; i < beats.length; i++) {
    const t = beats[i];
    const pos = (i + first) % 4;
    const next = beats[i + 1] ?? t + (t - (beats[i - 1] ?? t - 0.5));
    if (pos === 0) {
      downbeats.push(t);
      if (opts.chords) {
        // The chord lasts the bar (4 beats, or to the end of the song).
        const barEnd = beats[i + 4] ?? duration;
        track.add(t, chord(opts.chords[bar % opts.chords.length], Math.min(barEnd, duration) - t));
      }
      bar++;
    }
    const kickHere = opts.fourOnFloor ? true : pos === 0 || pos === 2;
    if (kickHere) track.add(t, k, pos === 0 ? 1 + (opts.accentOne ?? 0) : 1);
    if ((opts.snare ?? true) && (pos === 1 || pos === 3)) track.add(t, s, 0.8);
    if (opts.offbeatHats !== undefined) {
      track.add((t + next) / 2, h, opts.offbeatHats);
    } else {
      track.add(t, h, 0.35);
      track.add((t + next) / 2, h, 0.35);
    }
  }
  return { track, beats, downbeats };
}

/** Beat times at a constant tempo. */
export function steadyBeats(bpm: number, start: number, end: number): number[] {
  const out: number[] = [];
  for (let t = start; t < end - 0.05; t += 60 / bpm) out.push(Math.round(t * SR) / SR);
  return out;
}

/** Beat times for a tempo that ramps linearly from bpm0 at t=start to bpm1 at t=end. */
export function rampBeats(bpm0: number, bpm1: number, start: number, end: number): number[] {
  // Beats elapsed after t seconds: n(t) = (bpm0·t + a·t²/2) / 60 with a = (bpm1 - bpm0) / span.
  const span = end - start;
  const a = (bpm1 - bpm0) / span;
  const out: number[] = [];
  for (let n = 0; ; n++) {
    const t = a === 0 ? (60 * n) / bpm0 : (-bpm0 + Math.sqrt(bpm0 * bpm0 + 2 * a * 60 * n)) / a;
    if (start + t >= end - 0.05) break;
    out.push(Math.round((start + t) * SR) / SR);
  }
  return out;
}
