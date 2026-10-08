// glibc's sinf/cosf, as the Rust film calls them through f32::sin, f32::cos and
// f32::sin_cos on x86-64 Linux (sysdeps/ieee754/flt-32, the FMA variant glibc picks on
// current CPUs, where GCC fuses `a + b * c`). Math.sin rounded to f32 is the correctly
// rounded sine; glibc is accurate to 0.56 ulp instead, so the two disagree on some
// inputs, and an object's rotation vectors (and so its texel edges) move with them.

const f = Math.fround;

// --- exact double fused multiply-add ---------------------------------------------------
const view = new DataView(new ArrayBuffer(8));

function decompose(x) {
  view.setFloat64(0, x);
  const hi = view.getUint32(0);
  const lo = view.getUint32(4);
  const exp = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  if (exp) mant |= 1n << 52n;
  const sign = hi >>> 31 ? -1n : 1n;
  return [sign * mant, (exp || 1) - 1075];
}

/** a * b + c with a single rounding. */
export function fma(a, b, c) {
  if (a === 0 || b === 0) return a * b + c;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return a * b + c;
  const [ma, ea] = decompose(a);
  const [mb, eb] = decompose(b);
  let mp = ma * mb;
  let ep = ea + eb;
  if (c === 0) return Number(mp) * 2 ** ep;
  let [mc, ec] = decompose(c);
  const e = Math.min(ep, ec);
  mp <<= BigInt(ep - e);
  mc <<= BigInt(ec - e);
  const sum = mp + mc;
  if (sum === 0n) return 0;
  // Number(BigInt) rounds to nearest, ties to even; scale the exact sum down to ~64 bits
  // first, folding the discarded bits into a sticky bit so that rounding stays correct.
  let s = sum < 0n ? -sum : sum;
  let shift = 0;
  const bits = s.toString(2).length;
  if (bits > 64) {
    shift = bits - 64;
    const sticky = (s & ((1n << BigInt(shift)) - 1n)) !== 0n;
    s = (s >> BigInt(shift)) | (sticky ? 1n : 0n);
  }
  const value = Number(s) * 2 ** (e + shift);
  return sum < 0n ? -value : value;
}

// --- sinf / cosf ------------------------------------------------------------------------
const T0 = {
  sign: [1, -1, -1, 1],
  hpiInv: 0x145F306DC9C883 * 2 ** -29, // 0x1.45F306DC9C883p+23 (2/pi, scaled by 2^24)
  hpi: 0x1921FB54442D18 * 2 ** -52, // 0x1.921FB54442D18p0
  c0: 1,
  c1: -0x1ffffffd0c621c * 2 ** -54,
  c2: 0x155553e1068f19 * 2 ** -57,
  c3: -0x16c087e89a359d * 2 ** -62,
  c4: 0x199343027bf8c3 * 2 ** -68,
  s1: -0x1555545995a603 * 2 ** -55,
  s2: 0x11107605230bc4 * 2 ** -59,
  s3: -0x1994eb3774cf24 * 2 ** -65,
};
const T1 = { ...T0, c0: -1, c1: -T0.c1, c2: -T0.c2, c3: -T0.c3, c4: -T0.c4 };
const PI63 = 0x1921FB54442D18 * 2 ** -114; // 0x1.921FB54442D18p-62
const INV_PIO4 = [
  0xa2, 0xa2f9, 0xa2f983, 0xa2f9836e, 0xf9836e4e, 0x836e4e44, 0x6e4e4415, 0x4e441529,
  0x441529fc, 0x1529fc27, 0x29fc2757, 0xfc2757d1, 0x2757d1f5, 0x57d1f534, 0xd1f534dd, 0xf534ddc0,
  0x34ddc0db, 0xddc0db62, 0xc0db6295, 0xdb629599, 0x6295993c, 0x95993c43, 0x993c4390, 0x3c439041,
].map(BigInt);

const fbits = new DataView(new ArrayBuffer(4));
const asuint = (x) => { fbits.setFloat32(0, x); return fbits.getUint32(0); };
const abstop12 = (x) => (asuint(x) >>> 20) & 0x7ff;
const PIO4 = abstop12(f(0x1921FB6 * 2 ** -25));
const TINY = abstop12(2 ** -12);
const LIMIT = abstop12(120);

function poly(x, x2, p, n) {
  if ((n & 1) === 0) {
    const x3 = x * x2;
    const s1 = fma(x2, p.s3, p.s2);
    const x7 = x3 * x2;
    const s = fma(x3, p.s1, x);
    return f(fma(x7, s1, s));
  }
  const x4 = x2 * x2;
  const c2 = fma(x2, p.c4, p.c3);
  const c1 = fma(x2, p.c1, p.c0);
  const x6 = x4 * x2;
  const c = fma(x4, p.c2, c1);
  return f(fma(x6, c2, c));
}

function reduceFast(x) {
  const r = x * T0.hpiInv;
  const n = ((Math.trunc(r) | 0) + 0x800000) >> 24;
  return [fma(-n, T0.hpi, x), n];
}

const M64 = (1n << 64n) - 1n;
function reduceLarge(xi) {
  const at = (xi >>> 26) & 15;
  const shift = BigInt((xi >>> 23) & 7);
  let x = BigInt((xi & 0xffffff) | 0x800000) << shift;
  x &= 0xffffffffn;
  let res0 = (x * INV_PIO4[at]) & 0xffffffffn;
  const res1 = x * INV_PIO4[at + 4];
  const res2 = x * INV_PIO4[at + 8];
  res0 = ((res2 >> 32n) | (res0 << 32n)) & M64;
  res0 = (res0 + res1) & M64;
  const n = ((res0 + (1n << 61n)) & M64) >> 62n;
  res0 = (res0 - (n << 62n)) & M64;
  return [Number(BigInt.asIntN(64, res0)) * PI63, Number(n)];
}

function sincos(y, cos) {
  const x = y;
  const top = abstop12(y);
  if (top < PIO4) {
    if (top < TINY) return cos ? 1 : y;
    return poly(x, x * x, T0, cos ? 1 : 0);
  }
  if (top < LIMIT) {
    const [r, n] = reduceFast(x);
    const s = T0.sign[n & 3];
    const p = n & 2 ? T1 : T0;
    return poly(r * s, r * r, p, cos ? n ^ 1 : n);
  }
  if (Number.isFinite(y)) {
    const xi = asuint(y);
    const sign = xi >>> 31;
    const [r, n] = reduceLarge(xi);
    const s = T0.sign[(n + sign) & 3];
    const p = (n + sign) & 2 ? T1 : T0;
    return poly(r * s, r * r, p, cos ? n ^ 1 : n);
  }
  return NaN;
}

/** glibc sinf of an f32 value. */
export const sinf = (x) => sincos(f(x), false);
/** glibc cosf of an f32 value. */
export const cosf = (x) => sincos(f(x), true);

// --- the Rust `libm` crate (0.2.11, FreeBSD/musl) ---------------------------------------
// fframes' spring easing calls libm::expf/sinf/cosf rather than the system libm.

const FRAC_PI_2 = Math.PI / 2;
const kSinf = (x) => {
  const z = x * x;
  const w = z * z;
  const r = -0.000198393348360966317347 + z * 0.0000027183114939898219064;
  const s = z * x;
  return f((x + s * (-0.166666666416265235595 + z * 0.0083333293858894631756)) + s * w * r);
};
const kCosf = (x) => {
  const z = x * x;
  const w = z * z;
  const r = -0.00138867637746099294692 + z * 0.0000243904487962774090654;
  return f(((1.0 + z * -0.499999997251031003120) + w * 0.0416666233237390631894) + (w * z) * r);
};
const TOINT = 1.5 / Number.EPSILON;
function remPio2f(x) {
  const tmp = x * 6.36619772367581382433e-01 + TOINT;
  const fn = tmp - TOINT;
  return [Math.trunc(fn), x - fn * 1.57079631090164184570e+00 - fn * 1.58932547735281966916e-08];
}

/** libm::sinf for the arguments the spring uses (|x| < 2^28). */
export function muslSinf(x) {
  x = f(x);
  const ix = asuint(x) & 0x7fffffff;
  const sign = asuint(x) >>> 31;
  if (ix <= 0x3f490fda) return ix < 0x39800000 ? x : kSinf(x);
  if (ix <= 0x407b53d1) {
    if (ix <= 0x4016cbe3) return sign ? -kCosf(x + FRAC_PI_2) : kCosf(x - FRAC_PI_2);
    return kSinf(sign ? -(x + 2 * FRAC_PI_2) : -(x - 2 * FRAC_PI_2));
  }
  if (ix <= 0x40e231d5) {
    if (ix <= 0x40afeddf) return sign ? kCosf(x + 3 * FRAC_PI_2) : -kCosf(x - 3 * FRAC_PI_2);
    return kSinf(sign ? x + 4 * FRAC_PI_2 : x - 4 * FRAC_PI_2);
  }
  const [n, y] = remPio2f(x);
  return [kSinf(y), kCosf(y), kSinf(-y), -kCosf(y)][n & 3];
}

/** libm::cosf for the arguments the spring uses (|x| < 2^28). */
export function muslCosf(x) {
  x = f(x);
  const ix = asuint(x) & 0x7fffffff;
  const sign = asuint(x) >>> 31;
  if (ix <= 0x3f490fda) return ix < 0x39800000 ? 1 : kCosf(x);
  if (ix <= 0x407b53d1) {
    if (ix > 0x4016cbe3) return -kCosf(sign ? x + 2 * FRAC_PI_2 : x - 2 * FRAC_PI_2);
    return sign ? kSinf(x + FRAC_PI_2) : kSinf(FRAC_PI_2 - x);
  }
  if (ix <= 0x40e231d5) {
    if (ix > 0x40afeddf) return kCosf(sign ? x + 4 * FRAC_PI_2 : x - 4 * FRAC_PI_2);
    return sign ? kSinf(-x - 3 * FRAC_PI_2) : kSinf(x - 3 * FRAC_PI_2);
  }
  const [n, y] = remPio2f(x);
  return [kCosf(y), kSinf(-y), -kCosf(y), kSinf(y)][n & 3];
}

/** libm::expf (all in f32). */
export function muslExpf(x) {
  x = f(x);
  let hx = asuint(x);
  const sign = hx >>> 31;
  hx &= 0x7fffffff;
  if (hx >= 0x42aeac50) {
    if (hx > 0x7f800000) return x;
    if (hx >= 0x42b17218 && !sign) return Infinity;
    if (sign && hx >= 0x42cff1b5) return 0;
  }
  let k;
  let hi;
  let lo;
  if (hx > 0x3eb17218) {
    k = hx > 0x3f851592 ? Math.trunc(f(f(f(1.4426950216) * x) + (sign ? -0.5 : 0.5))) : 1 - sign - sign;
    const kf = f(k);
    hi = f(x - f(kf * f(6.9314575195e-01)));
    lo = f(kf * f(1.4286067653e-06));
    x = f(hi - lo);
  } else if (hx > 0x39000000) {
    k = 0;
    hi = x;
    lo = 0;
  } else {
    return f(1 + x);
  }
  const xx = f(x * x);
  const c = f(x - f(xx * f(f(1.6666625440e-1) + f(xx * f(-2.7667332906e-3)))));
  const y = f(1 + f(f(f(f(x * c) / f(2 - c)) - lo) + hi));
  return k === 0 ? y : f(y * 2 ** k);
}
