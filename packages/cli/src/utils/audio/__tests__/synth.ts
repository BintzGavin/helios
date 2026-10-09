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

/**
 * Noise through a band-pass whose centre sweeps exponentially from f0 to f1 over `seconds`,
 * with amplitude `amp(p)` for progress p = 0…1. A riser (rising amp) or a reverse swell.
 */
export function sweptNoise(seconds: number, f0: number, f1: number, amp: (p: number) => number, seed = 43): Float32Array {
  const rnd = noise(seed);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const q = 2;
  return make(seconds, (t) => {
    const p = t / seconds;
    const f = f0 * Math.pow(f1 / f0, p);
    const w = (2 * Math.PI * f) / SR;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    const x = rnd();
    // RBJ band-pass (constant 0 dB peak gain).
    const y = ((alpha * x - alpha * x2) - (-2 * Math.cos(w)) * y1 - (1 - alpha) * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y * amp(p);
  });
}

/** A drop's impact: a sub boom gliding 68→38 Hz over ~0.95 s, a noise burst and a crash. */
export function impact(): Float32Array {
  const rnd = noise(53);
  const wash = crash();
  let phase = 0;
  return make(1.5, (t, i) => {
    const f = 38 + 30 * Math.exp(-t / 0.3);
    phase += (2 * Math.PI * f) / SR;
    const boom = Math.sin(phase) * Math.exp(-t / 0.32) * (t < 0.95 ? 1 : Math.max(0, 1 - (t - 0.95) / 0.1));
    const burst = rnd() * 0.5 * Math.exp(-t / 0.08);
    return 0.9 * boom + burst + 0.6 * (wash[i] ?? 0);
  });
}

/** A typewriter or UI click: 2.6–4 kHz band-passed noise, about 6 ms long. */
export function click(seed: number): Float32Array {
  const rnd = noise(seed);
  const hp = biquadState(2600, 'highpass');
  const lp = biquadState(4000, 'lowpass');
  // Scaled so its peak is about a hat's.
  return make(0.006, (t) => 6 * lp(hp(rnd())) * Math.exp(-t / 0.002));
}

function biquadState(cutoff: number, type: 'lowpass' | 'highpass'): (x: number) => number {
  const w = (2 * Math.PI * cutoff) / SR;
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2);
  const cos = Math.cos(w);
  const a0 = 1 + alpha;
  const b = type === 'lowpass' ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] : [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b[0] * x + b[1] * x1 + b[2] * x2 - -2 * cos * y1 - (1 - alpha) * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

/** A plucked note (sine plus octave, fast decay), for arpeggios. */
export function pluck(freq: number, seconds = 0.12): Float32Array {
  return make(seconds, (t) => (Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(4 * Math.PI * freq * t)) * Math.exp(-t / 0.04) * Math.min(1, t / 0.002));
}

/** A bass note: a sine with a little second harmonic, short attack. */
export function bassNote(freq: number, seconds: number): Float32Array {
  return make(seconds, (t) => (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t)) * Math.min(1, t / 0.005) * Math.exp(-t / 0.4));
}

/** A pad chord; `bright` adds the upper octaves a filter opening would. */
export function pad(freqs: number[], seconds: number, bright = false): Float32Array {
  return make(seconds, (t) => {
    const env = Math.max(0, Math.min(1, t / 0.03, (seconds - t) / 0.03));
    let v = 0;
    for (const f of freqs) {
      v += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
      if (bright) v += 0.35 * Math.sin(6 * Math.PI * f * t) + 0.25 * Math.sin(8 * Math.PI * f * t);
    }
    return v * 0.1 * env;
  });
}

export interface Song {
  track: Track;
  bpm: number;
  /** Start of bar k (bar 0 first). */
  bar: (k: number) => number;
  /** Every true beat. */
  beats: number[];
}

const CHORDS = [
  [NOTE.C4, NOTE.E4, NOTE.G4],
  [NOTE.A3, NOTE.C4, NOTE.E4],
  [NOTE.F3, NOTE.A3, NOTE.C4],
  [NOTE.G3, NOTE.B3, NOTE.D4],
];

/**
 * The 124 BPM drop song (21.4 bars). Bars 0–2 pad; 2–4 adds an arp; 4–8 kick, snare and hats;
 * 6–8 a band-pass riser (300 Hz→6 kHz, amplitude p²) with a 16th snare roll over the last two
 * beats and no kick on the last one; 8–16 the drop (impact, full drums, bass, a brighter pad);
 * 16–20 a break with only pad and arp, a reverse swell (600→7600 Hz, p³) over bar 19; and the
 * final impact on bar 20, ringing out.
 */
export function dropSong(): Song {
  const bpm = 124;
  const beat = 60 / bpm;
  const bar = (k: number) => Math.round(k * 4 * beat * SR) / SR;
  const track = new Track(bar(21.4));
  const k = kick();
  const s = snare();
  const h = hat();
  const beats: number[] = [];
  for (let b = 0; b < 21.4 * 4 - 0.5; b++) beats.push(Math.round(b * beat * SR) / SR);

  for (let n = 0; n < 20; n++) {
    const chordNotes = CHORDS[n % 4];
    const drop = n >= 8 && n < 16;
    track.add(bar(n), pad(chordNotes, bar(n + 1) - bar(n), drop), drop ? 1.2 : 1);
    if (n >= 2) {
      for (let i = 0; i < 16; i++) track.add(bar(n) + (i * beat) / 4, pluck(chordNotes[i % 3] * 2), 0.12);
    }
    const drums = n >= 4 && n < 16;
    for (let q = 0; q < 4 && drums; q++) {
      const t = bar(n) + q * beat;
      const roll = n === 7 && q >= 2;
      if (!(n === 7 && q === 3)) track.add(t, k, drop ? 1 : 0.7);
      if (!roll && (q === 1 || q === 3)) track.add(t, s, drop ? 0.8 : 0.55);
      track.add(t + beat / 2, h, drop ? 0.35 : 0.25);
      if (drop) track.add(t + beat / 2, bassNote(chordNotes[0] / 4, beat / 2), 0.5);
    }
    if (n === 7) {
      for (let i = 0; i < 8; i++) track.add(bar(7) + 2 * beat + (i * beat) / 4, s, 0.25 + 0.06 * i);
    }
  }
  // Riser into the drop, and the drop's impact.
  track.add(bar(6), sweptNoise(bar(8) - bar(6), 300, 6000, (p) => p * p), 0.9);
  track.add(bar(8), impact());
  // The break's reverse swell into the final hit, which rings out.
  track.add(bar(19), sweptNoise(bar(20) - bar(19), 600, 7600, (p) => p * p * p, 47), 1.1);
  track.add(bar(20), impact());
  track.add(bar(20), pad(CHORDS[0], track.duration - bar(20), true), 1.2);
  return { track, bpm, bar, beats };
}

/**
 * The 120 BPM typing song (25.5 bars, bar 0 at 0.5 s). Bars 0–1: pad and typewriter clicks
 * only; drums (four on the floor, snare on 2 and 4, 8th hats, thinner while text types) from
 * bar 1 to bar 23; clicks
 * (2.6–4 kHz, ~6 ms, 30–40 a second) while text types in bars 0–4, 9–12 and 17–20; a reverse
 * swell (600→7600 Hz, p³) over bar 23 with the drums out; the final impact on bar 24 (48 s).
 */
export function typingSong(): Song {
  const bpm = 120;
  const beat = 0.5;
  const bar = (k: number) => 0.5 + k * 2;
  const track = new Track(51.5);
  const k = kick();
  const s = snare();
  const h = hat();
  const beats: number[] = [];
  for (let t = 0; t < 51.5; t += beat) beats.push(t);

  // The pad fades in from the very start, so nothing but the clicks marks bar 0's first beat.
  track.add(0, pad(CHORDS[3], bar(0)), 0.8);
  for (let n = 0; n < 24; n++) {
    track.add(bar(n), pad(CHORDS[n % 4], 2), 0.8);
    if (n < 1 || n >= 23) continue;
    // While text types (bars 9–12 and 17–20) the kit thins out: kick on 1 and 3 in the first
    // passage, kick on 1 and snare on 3 (half time) in the second, so beats 2 and 4 have no drum.
    const sparse = (n >= 9 && n < 12) || (n >= 17 && n < 20);
    for (let q = 0; q < 4; q++) {
      const t = bar(n) + q * beat;
      // A soft kit, under clicks as loud as its snare.
      if (!sparse || q === 0 || (q === 2 && n < 12)) track.add(t, k, 0.6);
      if (sparse ? n >= 17 && q === 2 : q === 1 || q === 3) track.add(t, s, 0.4);
      track.add(t + beat / 2, h, 0.2);
    }
  }
  const rnd = noise(97);
  for (const [from, to] of [[0, 4], [9, 12], [17, 20]]) {
    // 30–40 clicks a second at irregular intervals, as keys are struck.
    for (let t = from === 0 ? 0 : bar(from); t < bar(to); t += 1 / 35 + rnd() * 0.004) {
      track.add(t, click(1000 + Math.round(t * 1000)), 0.9 + 0.3 * rnd());
    }
  }
  track.add(bar(23), sweptNoise(2, 600, 7600, (p) => p * p * p, 61), 1.1);
  track.add(bar(24), impact());
  track.add(bar(24), pad(CHORDS[0], 51.5 - bar(24), true), 1.2);
  return { track, bpm, bar, beats };
}
