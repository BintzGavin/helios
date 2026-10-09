/** Small numeric helpers shared by the analysis modules. */

export function percentile(values: ArrayLike<number>, q: number): number {
  if (values.length === 0) return 0;
  const sorted = Float64Array.from(values as ArrayLike<number>).sort();
  const pos = Math.min(sorted.length - 1, Math.max(0, q * (sorted.length - 1)));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function median(values: ArrayLike<number>): number {
  return percentile(values, 0.5);
}

export function mean(values: ArrayLike<number>, from = 0, to = values.length): number {
  if (to <= from) return 0;
  let sum = 0;
  for (let i = from; i < to; i++) sum += values[i];
  return sum / (to - from);
}

export function std(values: ArrayLike<number>): number {
  const m = mean(values);
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += (values[i] - m) ** 2;
  return Math.sqrt(sum / Math.max(1, values.length));
}

/** Gaussian smoothing with standard deviation sigma (in samples). */
export function gaussianSmooth(x: Float32Array, sigma: number): Float32Array {
  if (sigma <= 0) return Float32Array.from(x);
  const radius = Math.ceil(3 * sigma);
  const kernel = new Float64Array(2 * radius + 1);
  for (let i = -radius; i <= radius; i++) kernel[i + radius] = Math.exp(-0.5 * (i / sigma) ** 2);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let acc = 0;
    let weight = 0;
    for (let j = -radius; j <= radius; j++) {
      const k = i + j;
      if (k < 0 || k >= x.length) continue;
      acc += x[k] * kernel[j + radius];
      weight += kernel[j + radius];
    }
    out[i] = weight > 0 ? acc / weight : 0;
  }
  return out;
}

/** Prefix sums, so the mean of any span is O(1). */
export function prefixSums(x: ArrayLike<number>): Float64Array {
  const out = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) out[i + 1] = out[i] + x[i];
  return out;
}

/** Mean of x[from, to) from its prefix sums, clamped to the array. */
export function spanMean(prefix: Float64Array, from: number, to: number): number {
  const n = prefix.length - 1;
  const a = Math.max(0, Math.min(n, from));
  const b = Math.max(0, Math.min(n, to));
  return b > a ? (prefix[b] - prefix[a]) / (b - a) : 0;
}

/** Index of the first element of a sorted array that is >= value. */
export function lowerBound(sorted: ArrayLike<number>, value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The element of a sorted array nearest to value, or undefined when it is further than maxDistance. */
export function nearest(sorted: ArrayLike<number>, value: number, maxDistance = Infinity): number | undefined {
  const i = lowerBound(sorted, value);
  let best: number | undefined;
  for (const j of [i - 1, i]) {
    if (j < 0 || j >= sorted.length) continue;
    const d = Math.abs(sorted[j] - value);
    if (d <= maxDistance && (best === undefined || d < Math.abs(best - value))) best = sorted[j];
  }
  return best;
}

export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
