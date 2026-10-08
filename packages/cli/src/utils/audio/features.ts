import { RealFft, hannWindow } from './fft.js';

/** STFT frame: 2048 samples (46 ms at 44.1 kHz), enough to resolve the kick band. */
export const FRAME_SIZE = 2048;
/**
 * STFT hop: 512 samples (11.6 ms at 44.1 kHz). Onsets are timed on the fine envelopes, not on
 * the frames, so a finer hop would only cost time.
 */
export const HOP = 512;
/** Block size of the fine time-domain envelopes (1.45 ms at 44.1 kHz), used to time onsets. */
export const FINE_BLOCK = 64;
/** Band of the snare's fine envelope, in Hz. */
export const FINE_SNARE = [1500, 5000] as const;

/** Frequency bands, in Hz. The drum bands follow the claudia.gallery beat map. */
export const BANDS = {
  kick: [30, 150],
  snare: [150, 5000],
  hat: [6000, 16000],
  low: [20, 250],
  mid: [250, 4000],
  high: [4000, 16000],
  all: [20, 16000],
  chroma: [100, 5000],
} as const;
type Band = keyof typeof BANDS;

/**
 * Log compression for the spectral flux: log(1 + 1000·m), where m is the magnitude relative to
 * a full-scale sine. Anything 60 dB below full scale barely moves it, so the empty band of a
 * mix (no hats, say) stays near zero instead of turning noise into onsets.
 */
const LOG_GAIN = 1000;

export type DrumBand = 'kick' | 'snare' | 'hat';

/** Per-frame measurements of a song. Frame i is centred on sample i·hop. */
export interface Features {
  sampleRate: number;
  hop: number;
  /** Frames per second (sampleRate / hop). */
  frameRate: number;
  frames: number;
  /** Seconds of audio. */
  duration: number;
  /** Power per band (sum of |X|² over the band's bins; a full-scale sine is about 1). */
  power: Record<DrumBand | 'low' | 'mid' | 'high' | 'all', Float32Array>;
  /** Spectral flux per drum band: the mean rise in log magnitude per bin since the previous frame. */
  flux: Record<DrumBand, Float32Array>;
  /** 12 pitch-class magnitudes per frame (C = 0), frame-major. */
  chroma: Float32Array;
  /**
   * Mean square of the band-filtered signal per FINE_BLOCK samples (block j starts at sample
   * j·FINE_BLOCK). The STFT smears an attack over its 46 ms frame; these place it to ~2 ms.
   * The snare's is taken on its crack (FINE_SNARE), above the chords and vocals that share
   * the snare band and would ripple its envelope.
   */
  fine: Record<DrumBand, Float32Array>;
  /** Blocks per second of `fine`. */
  fineRate: number;
}

class Growable {
  data: Float32Array;
  length = 0;
  constructor(capacity: number) {
    this.data = new Float32Array(capacity);
  }
  private grow(min: number): void {
    let size = this.data.length * 2;
    while (size < min) size *= 2;
    const next = new Float32Array(size);
    next.set(this.data.subarray(0, this.length));
    this.data = next;
  }
  push(value: number): void {
    if (this.length === this.data.length) this.grow(this.length + 1);
    this.data[this.length++] = value;
  }
  pushMany(values: Float32Array): void {
    if (this.length + values.length > this.data.length) this.grow(this.length + values.length);
    this.data.set(values, this.length);
    this.length += values.length;
  }
  result(): Float32Array {
    return this.data.slice(0, this.length);
  }
}

/** Coefficients [b0, b1, b2, a1, a2] of a second-order (RBJ cookbook) filter, Q = 1/√2. */
function biquad(type: 'lowpass' | 'highpass', cutoff: number, sampleRate: number): Float64Array {
  const w = (2 * Math.PI * cutoff) / sampleRate;
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2);
  const cos = Math.cos(w);
  const a0 = 1 + alpha;
  const b = type === 'lowpass' ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] : [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  return Float64Array.of(b[0] / a0, b[1] / a0, b[2] / a0, (-2 * cos) / a0, (1 - alpha) / a0);
}

function binRange(band: readonly [number, number], sampleRate: number, size: number): [number, number] {
  const binHz = sampleRate / size;
  const lo = Math.max(1, Math.ceil(band[0] / binHz));
  const hi = Math.min(size / 2, Math.floor(band[1] / binHz));
  return [lo, Math.max(lo, hi)];
}

function sumRange(values: Float64Array, range: [number, number]): number {
  let sum = 0;
  for (let k = range[0]; k <= range[1]; k++) sum += values[k];
  return sum;
}

/**
 * Computes features while samples stream in, so a whole song never sits in memory as PCM.
 * Push mono samples in order, then call finish().
 */
export class FeatureExtractor {
  private readonly sampleRate: number;
  private readonly fft = new RealFft(FRAME_SIZE);
  private readonly window = hannWindow(FRAME_SIZE);
  private readonly frame = new Float64Array(FRAME_SIZE);
  private readonly specRe = new Float64Array(FRAME_SIZE / 2 + 1);
  private readonly specIm = new Float64Array(FRAME_SIZE / 2 + 1);
  private readonly pow = new Float64Array(FRAME_SIZE / 2 + 1);
  private readonly mag = new Float64Array(FRAME_SIZE / 2 + 1);
  private logMag = new Float64Array(FRAME_SIZE / 2 + 1);
  private prevLogMag = new Float64Array(FRAME_SIZE / 2 + 1);
  private readonly ranges: Record<Band, [number, number]>;
  /** Bins whose log magnitude the flux needs. */
  private readonly fluxBins: [number, number];
  /** Pitch class of each bin in the chroma range. */
  private readonly pitchClass: Uint8Array;
  private readonly chromaFrame = new Float32Array(12);

  /** Samples not yet consumed by a frame. */
  private buffer = new Float32Array(FRAME_SIZE * 8);
  private buffered = 0;
  private totalSamples = 0;
  private framesDone = 0;

  /** Fine-envelope filters (kick low-pass, snare high- then low-pass, hat high-pass) and their state. */
  private readonly coef: Float64Array[];
  private readonly state = new Float64Array(16);
  private readonly fineAcc = new Float64Array(3);
  private fineCount = 0;

  private readonly out = {
    power: {
      kick: new Growable(16384),
      snare: new Growable(16384),
      hat: new Growable(16384),
      low: new Growable(16384),
      mid: new Growable(16384),
      high: new Growable(16384),
      all: new Growable(16384),
    },
    flux: { kick: new Growable(16384), snare: new Growable(16384), hat: new Growable(16384) },
    fine: { kick: new Growable(65536), snare: new Growable(65536), hat: new Growable(65536) },
    chroma: new Growable(16384 * 12),
  };

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    const ranges = {} as Record<Band, [number, number]>;
    for (const key of Object.keys(BANDS) as Band[]) ranges[key] = binRange(BANDS[key], sampleRate, FRAME_SIZE);
    this.ranges = ranges;
    this.fluxBins = [
      Math.min(ranges.kick[0], ranges.snare[0], ranges.hat[0]),
      Math.max(ranges.kick[1], ranges.snare[1], ranges.hat[1]),
    ];

    const binHz = sampleRate / FRAME_SIZE;
    this.pitchClass = new Uint8Array(FRAME_SIZE / 2 + 1);
    for (let k = ranges.chroma[0]; k <= ranges.chroma[1]; k++) {
      const midi = 69 + 12 * Math.log2((k * binHz) / 440);
      this.pitchClass[k] = ((Math.round(midi) % 12) + 12) % 12;
    }

    this.coef = [
      biquad('lowpass', BANDS.kick[1], sampleRate),
      biquad('highpass', FINE_SNARE[0], sampleRate),
      biquad('lowpass', FINE_SNARE[1], sampleRate),
      biquad('highpass', BANDS.hat[0], sampleRate),
    ];

    // The first frame is centred on sample 0, so it starts half a frame of silence early.
    this.buffered = FRAME_SIZE / 2;
  }

  push(samples: Float32Array): void {
    this.totalSamples += samples.length;
    this.filterFine(samples);
    let offset = 0;
    while (offset < samples.length) {
      const n = Math.min(this.buffer.length - this.buffered, samples.length - offset);
      this.buffer.set(samples.subarray(offset, offset + n), this.buffered);
      this.buffered += n;
      offset += n;
      this.runFrames(Infinity);
    }
  }

  finish(): Features {
    // Pad the end with silence so the last frame is centred on (or just past) the last sample.
    const frames = Math.floor(this.totalSamples / HOP) + 1;
    while (this.framesDone < frames) {
      if (this.buffered + FRAME_SIZE > this.buffer.length) {
        const bigger = new Float32Array(this.buffer.length * 2);
        bigger.set(this.buffer.subarray(0, this.buffered));
        this.buffer = bigger;
      }
      this.buffer.fill(0, this.buffered, this.buffered + FRAME_SIZE);
      this.buffered += FRAME_SIZE;
      this.runFrames(frames);
    }
    if (this.fineCount > 0) this.flushFine();

    const o = this.out;
    const done = (g: Record<string, Growable>) =>
      Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.result()]));
    return {
      sampleRate: this.sampleRate,
      hop: HOP,
      frameRate: this.sampleRate / HOP,
      frames,
      duration: this.totalSamples / this.sampleRate,
      power: done(o.power) as Features['power'],
      flux: done(o.flux) as Features['flux'],
      chroma: o.chroma.result(),
      fine: done(o.fine) as Features['fine'],
      fineRate: this.sampleRate / FINE_BLOCK,
    };
  }

  /** Runs every frame whose samples are all buffered (up to `limit` frames in total). */
  private runFrames(limit: number): void {
    let start = 0;
    while (start + FRAME_SIZE <= this.buffered && this.framesDone < limit) {
      this.analyseFrame(start);
      start += HOP;
    }
    if (start > 0) {
      this.buffer.copyWithin(0, start, this.buffered);
      this.buffered -= start;
    }
  }

  private filterFine(samples: Float32Array): void {
    const [k, sh, sl, h] = this.coef;
    const st = this.state;
    const acc = this.fineAcc;
    // Filter state as locals: x1, x2, y1, y2 per filter.
    let kx1 = st[0], kx2 = st[1], ky1 = st[2], ky2 = st[3];
    let ax1 = st[4], ax2 = st[5], ay1 = st[6], ay2 = st[7];
    let bx1 = st[8], bx2 = st[9], by1 = st[10], by2 = st[11];
    let hx1 = st[12], hx2 = st[13], hy1 = st[14], hy2 = st[15];
    let sumK = acc[0], sumS = acc[1], sumH = acc[2];
    let count = this.fineCount;
    for (let i = 0; i < samples.length; i++) {
      const x = samples[i];
      const yk = k[0] * x + k[1] * kx1 + k[2] * kx2 - k[3] * ky1 - k[4] * ky2;
      kx2 = kx1; kx1 = x; ky2 = ky1; ky1 = yk;
      const ya = sh[0] * x + sh[1] * ax1 + sh[2] * ax2 - sh[3] * ay1 - sh[4] * ay2;
      ax2 = ax1; ax1 = x; ay2 = ay1; ay1 = ya;
      const yb = sl[0] * ya + sl[1] * bx1 + sl[2] * bx2 - sl[3] * by1 - sl[4] * by2;
      bx2 = bx1; bx1 = ya; by2 = by1; by1 = yb;
      const yh = h[0] * x + h[1] * hx1 + h[2] * hx2 - h[3] * hy1 - h[4] * hy2;
      hx2 = hx1; hx1 = x; hy2 = hy1; hy1 = yh;
      sumK += yk * yk;
      sumS += yb * yb;
      sumH += yh * yh;
      if (++count === FINE_BLOCK) {
        this.out.fine.kick.push(sumK / count);
        this.out.fine.snare.push(sumS / count);
        this.out.fine.hat.push(sumH / count);
        sumK = sumS = sumH = 0;
        count = 0;
      }
    }
    st.set([kx1, kx2, ky1, ky2, ax1, ax2, ay1, ay2, bx1, bx2, by1, by2, hx1, hx2, hy1, hy2]);
    acc[0] = sumK;
    acc[1] = sumS;
    acc[2] = sumH;
    this.fineCount = count;
  }

  private flushFine(): void {
    const n = this.fineCount;
    this.out.fine.kick.push(this.fineAcc[0] / n);
    this.out.fine.snare.push(this.fineAcc[1] / n);
    this.out.fine.hat.push(this.fineAcc[2] / n);
    this.fineAcc.fill(0);
    this.fineCount = 0;
  }

  private analyseFrame(start: number): void {
    const { frame, window, specRe, specIm, pow, mag, ranges, buffer } = this;
    for (let i = 0; i < FRAME_SIZE; i++) frame[i] = buffer[start + i] * window[i];
    this.fft.forward(frame, specRe, specIm);

    // A full-scale sine through a Hann window peaks at |X| = size/4.
    const norm2 = (4 / FRAME_SIZE) ** 2;
    const top = ranges.all[1];
    for (let k = 1; k <= top; k++) {
      const p = (specRe[k] * specRe[k] + specIm[k] * specIm[k]) * norm2;
      pow[k] = p;
      mag[k] = Math.sqrt(p);
    }

    const logMag = this.logMag;
    const prev = this.prevLogMag;
    for (let k = this.fluxBins[0]; k <= this.fluxBins[1]; k++) logMag[k] = Math.log1p(LOG_GAIN * mag[k]);
    const first = this.framesDone === 0;
    const flux = (range: [number, number]): number => {
      if (first) return 0;
      let sum = 0;
      for (let k = range[0]; k <= range[1]; k++) {
        const d = logMag[k] - prev[k];
        if (d > 0) sum += d;
      }
      return sum / (range[1] - range[0] + 1);
    };

    const chroma = this.chromaFrame;
    chroma.fill(0);
    const pc = this.pitchClass;
    for (let k = ranges.chroma[0]; k <= ranges.chroma[1]; k++) chroma[pc[k]] += mag[k];

    const o = this.out;
    o.power.kick.push(sumRange(pow, ranges.kick));
    o.power.snare.push(sumRange(pow, ranges.snare));
    o.power.hat.push(sumRange(pow, ranges.hat));
    o.power.low.push(sumRange(pow, ranges.low));
    o.power.mid.push(sumRange(pow, ranges.mid));
    o.power.high.push(sumRange(pow, ranges.high));
    o.power.all.push(sumRange(pow, ranges.all));
    o.flux.kick.push(flux(ranges.kick));
    o.flux.snare.push(flux(ranges.snare));
    o.flux.hat.push(flux(ranges.hat));
    o.chroma.pushMany(chroma);

    this.logMag = prev;
    this.prevLogMag = logMag;
    this.framesDone++;
  }
}
