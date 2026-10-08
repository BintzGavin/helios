// A port of fframes' `timeline!` keyframes, CSS-like cubic-bezier easings and the WebKit
// spring. The Rust film computes all of this in f32, so every step here is rounded with
// Math.fround: keyframe boundaries then land on exactly the same frames.

import { muslCosf, muslExpf, muslSinf } from './libm.js';

export const f = Math.fround;
export const FPS = 24;

/** `Frame::seconds()`: a scene-local frame index in seconds, as f32. */
export const seconds = (index, fps = FPS) => f(f(index) / f(fps));

// bezier-easing by Gaëtan Renaudeau, as ported to f32 in fframes/src/animation/cubic_bezier.rs.
const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = f(0.001);
const SUBDIVISION_PRECISION = f(0.0000001);
const SUBDIVISION_MAX_ITERATIONS = 10;
const TABLE_SIZE = 11;
const SAMPLE_STEP = f(1 / f(TABLE_SIZE - 1));

const coefA = (a1, a2) => f(f(1 - f(3 * a2)) + f(3 * a1));
const coefB = (a1, a2) => f(f(3 * a2) - f(6 * a1));
const coefC = (a1) => f(3 * a1);
const slope = (t, a1, a2) =>
  f(f(f(f(f(3 * coefA(a1, a2)) * t) * t) + f(f(2 * coefB(a1, a2)) * t)) + coefC(a1));
const bezier = (t, a1, a2) => f(f(f(f(f(coefA(a1, a2) * t) + coefB(a1, a2)) * t) + coefC(a1)) * t);

class CubicBezier {
  constructor(x1, y1, x2, y2) {
    this.x1 = Math.min(1, Math.max(0, f(x1)));
    this.y1 = f(y1);
    this.x2 = Math.min(1, Math.max(0, f(x2)));
    this.y2 = f(y2);
    this.samples = Array.from({ length: TABLE_SIZE }, (_, i) =>
      bezier(f(i * SAMPLE_STEP), this.x1, this.x2));
  }

  solve(x) {
    const clamped = Math.min(1, Math.max(0, x));
    if (this.x1 === this.y1 && this.x2 === this.y2) return x;
    if (x === 0 || x === 1) return x;
    return bezier(this.tForX(clamped), this.y1, this.y2);
  }

  tForX(x) {
    let start = 0;
    let sample = 1;
    const last = TABLE_SIZE - 1;
    while (sample !== last && this.samples[sample] <= x) {
      start = f(start + SAMPLE_STEP);
      sample++;
    }
    sample--;
    const dist = f(f(x - this.samples[sample]) / f(this.samples[sample + 1] - this.samples[sample]));
    const guess = f(start + f(dist * SAMPLE_STEP));
    const initial = slope(guess, this.x1, this.x2);
    if (initial >= NEWTON_MIN_SLOPE) return this.newton(x, guess);
    if (initial === 0) return guess;
    return this.subdivide(x, start, f(start + SAMPLE_STEP));
  }

  newton(x, guess) {
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const s = slope(guess, this.x1, this.x2);
      if (s === 0) return guess;
      const current = f(bezier(guess, this.x1, this.x2) - x);
      guess = f(guess - f(current / s));
    }
    return guess;
  }

  subdivide(x, a, b) {
    let t;
    let current;
    let i = 0;
    for (;;) {
      t = f(a + f(f(b - a) / 2));
      current = f(bezier(t, this.x1, this.x2) - x);
      if (current > 0) b = t; else a = t;
      if (!(Math.abs(current) > SUBDIVISION_PRECISION && i < SUBDIVISION_MAX_ITERATIONS)) break;
      i++;
    }
    return t;
  }
}

// fframes/src/animation/spring.rs (inspired by webkit.org/demos/spring/spring.js), which
// evaluates with the Rust libm crate's expf/sinf/cosf.
class Spring {
  constructor(mass, stiffness, damping) {
    this.zeta = f(f(damping) / f(2 * f(Math.sqrt(f(f(stiffness) * f(mass))))));
    this.w0 = f(Math.sqrt(f(f(stiffness) / f(mass))));
    if (this.zeta < 1) {
      this.wd = f(this.w0 * f(Math.sqrt(f(1 - f(this.zeta * this.zeta)))));
      this.a = 1;
      this.b = f(f(this.zeta * this.w0) / this.wd);
    } else {
      this.wd = 0;
      this.a = 1;
      this.b = this.w0;
    }
  }

  solve(t) {
    const progress = this.zeta < 1
      ? f(muslExpf(f(f(-t * this.zeta) * this.w0))
        * f(f(this.a * muslCosf(f(this.wd * t))) + f(this.b * muslSinf(f(this.wd * t)))))
      : f(f(this.a + f(this.b * t)) * muslExpf(f(-t * this.w0)));
    return f(1 - progress);
  }

  // anime.js' duration estimate, kept with its quirk: the result is multiplied by the
  // step once more, exactly like the Rust code.
  duration() {
    const step = f(0.166667);
    let elapsed = 0;
    let still = 0;
    for (;;) {
      elapsed = f(elapsed + step);
      if (this.solve(elapsed) === 1) {
        if (++still >= 128) break;
      } else {
        still = 0;
      }
    }
    return f(elapsed * step);
  }
}

export const Easing = {
  Linear: { kind: 'linear' },
  EaseIn: { kind: 'bezier', args: [0.42, 0, 1, 1] },
  EaseOut: { kind: 'bezier', args: [0, 0, 0.58, 1] },
  EaseInOut: { kind: 'bezier', args: [0.42, 0, 0.58, 1] },
  cubicBezier: (x1, y1, x2, y2) => ({ kind: 'bezier', args: [x1, y1, x2, y2] }),
  spring: (mass, stiffness, damping) => ({ kind: 'spring', args: [mass, stiffness, damping] }),
};

function runtime(duration, easing) {
  switch (easing.kind) {
    case 'linear':
      return { duration, solve: (t) => f(t / duration) };
    case 'bezier': {
      const curve = new CubicBezier(...easing.args);
      return { duration, solve: (t) => curve.solve(f(t / duration)) };
    }
    case 'spring': {
      const spring = new Spring(...easing.args);
      return { duration: Math.min(spring.duration(), duration), solve: (t) => spring.solve(t) };
    }
    default:
      throw new Error(`unknown easing ${easing.kind}`);
  }
}

const still = (duration) => ({ duration, solve: () => 0 });

/** f32 `Animatable` for numbers. */
export const lerpNumber = (from, to, p) => f(from + f(f(to - from) * p));

/**
 * `fframes::timeline!`: keys are `{ at, end?, from, to, easing }` with times in seconds.
 * A key without `end` lasts until the next key starts (or, for a spring, as long as the
 * spring moves). Gaps hold the previous value.
 */
export function timeline(keys, lerp = lerpNumber) {
  const value = (v) => (typeof v === 'number' ? f(v) : v);
  const tweens = keys
    .map((k) => ({
      ...k,
      at: f(k.at),
      end: k.end === undefined ? undefined : f(k.end),
      from: value(k.from),
      to: value(k.to),
    }))
    .sort((a, b) => a.at - b.at);
  const frames = [];
  tweens.forEach((tween, i) => {
    const next = tweens[i + 1];
    let duration;
    if (tween.end !== undefined) duration = f(tween.end - tween.at);
    else if (next) duration = f(next.at - tween.at);
    else if (tween.easing.kind === 'spring') duration = 3.4028234663852886e38;
    else return;
    const run = runtime(duration, tween.easing);
    const key = { start: tween.at, end: f(tween.at + run.duration), from: tween.from, to: tween.to, run };
    frames.push(key);
    if (next && next.at > key.end) {
      frames.push({ start: key.end, end: next.at, from: key.to, to: key.to, run: still(f(next.at - key.end)) });
    }
  });
  if (tweens[0].at > 0) {
    frames.unshift({ start: 0, end: tweens[0].at, from: tweens[0].from, to: tweens[0].from, run: still(tweens[0].at) });
  }
  return { frames, final: tweens[tweens.length - 1].to, lerp };
}

/** `Frame::animate`: the timeline's value at `t` seconds (scene-local, f32). */
export function animate(tl, t) {
  const key = tl.frames.find((k) => k.start <= t && t < k.end);
  if (!key) return tl.final;
  return tl.lerp(key.from, key.to, key.run.solve(f(t - key.start)));
}

// fframes::Transform: translate, then rotate (degrees), then scale; fields are f64.
export const Transform = {
  identity: () => ({ tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 }),
  translate: (tx, ty) => ({ tx, ty, rot: 0, sx: 1, sy: 1 }),
  scale: (sx, sy = sx) => ({ tx: 0, ty: 0, rot: 0, sx, sy }),
  of: (o) => ({ ...Transform.identity(), ...o }),
  lerp: (a, b, p) => ({
    tx: a.tx + (b.tx - a.tx) * p,
    ty: a.ty + (b.ty - a.ty) * p,
    rot: a.rot + (b.rot - a.rot) * p,
    sx: a.sx + (b.sx - a.sx) * p,
    sy: a.sy + (b.sy - a.sy) * p,
  }),
  /** The 2D matrix [a, b, c, d, e, f] that fframes writes into the SVG `transform`. */
  matrix(t) {
    const r = t.rot * (Math.PI / 180); // Rust's to_radians
    const cos = t.rot ? Math.cos(r) : 1;
    const sin = t.rot ? Math.sin(r) : 0;
    return [cos * t.sx, sin * t.sx, -sin * t.sy, cos * t.sy, t.tx, t.ty];
  },
};

export const transformTimeline = (keys) => timeline(keys, Transform.lerp);
