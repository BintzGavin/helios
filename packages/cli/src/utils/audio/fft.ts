/**
 * A radix-2 FFT for real input, sized once and reused for every frame of a song.
 *
 * The real signal of length n is packed into a complex signal of length n/2 (even samples as
 * the real part, odd samples as the imaginary part), transformed, then split back into the
 * spectrum of the real signal. That halves the work of a plain complex FFT.
 */
export class RealFft {
  readonly size: number;
  private readonly half: number;
  private readonly rev: Uint32Array;
  /** e^(-2πi·j/half) for the complex transform of length half. */
  private readonly cosHalf: Float64Array;
  private readonly sinHalf: Float64Array;
  /** e^(-2πi·k/size), used to split the packed spectrum. */
  private readonly cosFull: Float64Array;
  private readonly sinFull: Float64Array;
  private readonly re: Float64Array;
  private readonly im: Float64Array;

  constructor(size: number) {
    if (size < 4 || (size & (size - 1)) !== 0) {
      throw new Error(`FFT size must be a power of two of at least 4 (got ${size})`);
    }
    this.size = size;
    const half = size >> 1;
    this.half = half;

    this.rev = new Uint32Array(half);
    const bits = Math.log2(half);
    for (let i = 0; i < half; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }

    this.cosHalf = new Float64Array(half >> 1 || 1);
    this.sinHalf = new Float64Array(half >> 1 || 1);
    for (let j = 0; j < half >> 1; j++) {
      this.cosHalf[j] = Math.cos((2 * Math.PI * j) / half);
      this.sinHalf[j] = -Math.sin((2 * Math.PI * j) / half);
    }

    this.cosFull = new Float64Array(half + 1);
    this.sinFull = new Float64Array(half + 1);
    for (let k = 0; k <= half; k++) {
      this.cosFull[k] = Math.cos((2 * Math.PI * k) / size);
      this.sinFull[k] = -Math.sin((2 * Math.PI * k) / size);
    }

    this.re = new Float64Array(half);
    this.im = new Float64Array(half);
  }

  /**
   * Transforms `input` (length `size`) and writes bins 0..size/2 (inclusive) of its spectrum to
   * outRe/outIm, which must hold size/2 + 1 values.
   */
  forward(input: ArrayLike<number>, outRe: Float64Array, outIm: Float64Array): void {
    const { half, re, im, rev } = this;
    for (let i = 0; i < half; i++) {
      const j = rev[i];
      re[j] = input[2 * i];
      im[j] = input[2 * i + 1];
    }

    const { cosHalf, sinHalf } = this;
    for (let span = 2; span <= half; span <<= 1) {
      const step = half / span;
      const halfSpan = span >> 1;
      for (let k = 0; k < halfSpan; k++) {
        const wr = cosHalf[k * step];
        const wi = sinHalf[k * step];
        for (let start = k; start < half; start += span) {
          const b = start + halfSpan;
          const xr = re[b] * wr - im[b] * wi;
          const xi = re[b] * wi + im[b] * wr;
          re[b] = re[start] - xr;
          im[b] = im[start] - xi;
          re[start] += xr;
          im[start] += xi;
        }
      }
    }

    // Split the packed transform Z into the spectrum X of the real input:
    // X[k] = E[k] + W^k·O[k], with E = (Z[k] + conj Z[half-k]) / 2 and O = -i·(Z[k] - conj Z[half-k]) / 2.
    const { cosFull, sinFull } = this;
    for (let k = 0; k <= half; k++) {
      const a = k === half ? 0 : k;
      const m = k === 0 ? 0 : half - k;
      const ar = re[a];
      const ai = im[a];
      const br = re[m];
      const bi = -im[m];
      const er = (ar + br) * 0.5;
      const ei = (ai + bi) * 0.5;
      const or = (ai - bi) * 0.5;
      const oi = -(ar - br) * 0.5;
      const c = cosFull[k];
      const s = sinFull[k];
      outRe[k] = er + or * c - oi * s;
      outIm[k] = ei + or * s + oi * c;
    }
  }
}

/** A periodic Hann window, the usual choice for overlapping STFT frames. */
export function hannWindow(size: number): Float64Array {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  return w;
}
