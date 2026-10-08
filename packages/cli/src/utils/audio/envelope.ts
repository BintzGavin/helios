/**
 * Loudness envelopes scaled 0–1, for drawing and for finding hits and sections.
 */

/** 0 is this many dB below the band's loudest moment, 1 is the loudest moment. */
export const ENVELOPE_RANGE_DB = 48;
/** The loudest moment is measured on 50 ms averages, so one click doesn't set the scale. */
const REFERENCE_SECONDS = 0.05;
/** Power at or below this (dB re a full-scale sine) is silence: a band with nothing in it stays at 0. */
const SILENCE_DB = -90;

export class BandEnvelope {
  private readonly prefix: Float64Array;
  private readonly topDb: number;
  private readonly bottomDb: number;

  constructor(private readonly power: Float32Array, private readonly frameRate: number) {
    this.prefix = new Float64Array(power.length + 1);
    for (let i = 0; i < power.length; i++) this.prefix[i + 1] = this.prefix[i] + power[i];
    const span = Math.max(1, Math.round(REFERENCE_SECONDS * frameRate));
    let loudest = 0;
    for (let i = 0; i + span <= power.length; i++) {
      loudest = Math.max(loudest, (this.prefix[i + span] - this.prefix[i]) / span);
    }
    if (power.length < span) loudest = this.prefix[power.length] / Math.max(1, power.length);
    this.topDb = toDb(loudest);
    this.bottomDb = Math.max(SILENCE_DB, this.topDb - ENVELOPE_RANGE_DB);
  }

  /** Mean power of the frames centred in [t0, t1), at least the frame nearest the middle. */
  private meanPower(t0: number, t1: number): number {
    const n = this.power.length;
    let a = Math.max(0, Math.ceil(t0 * this.frameRate));
    let b = Math.min(n, Math.ceil(t1 * this.frameRate));
    if (b <= a) {
      a = Math.min(n - 1, Math.max(0, Math.round(((t0 + t1) / 2) * this.frameRate)));
      b = a + 1;
    }
    return (this.prefix[b] - this.prefix[a]) / (b - a);
  }

  /** Scaled level of [t0, t1). */
  level(t0: number, t1: number): number {
    if (this.topDb <= this.bottomDb) return 0;
    const db = toDb(this.meanPower(t0, t1));
    return Math.min(1, Math.max(0, (db - this.bottomDb) / (this.topDb - this.bottomDb)));
  }

  /** One value per frame at `rate` per second; frame k covers [k - ½, k + ½) / rate. */
  sample(rate: number, duration: number): Float32Array {
    const count = frameCount(duration, rate);
    const out = new Float32Array(count);
    for (let k = 0; k < count; k++) out[k] = this.level((k - 0.5) / rate, (k + 0.5) / rate);
    return out;
  }
}

/** Frames in `duration` seconds at `rate` per second, counted like the renderer counts them. */
export function frameCount(duration: number, rate: number): number {
  return Math.max(1, Math.ceil(Math.round(duration * rate * 1e6) / 1e6));
}

function toDb(power: number): number {
  return 10 * Math.log10(power + 1e-12);
}
