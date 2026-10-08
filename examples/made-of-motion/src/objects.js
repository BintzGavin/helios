// Independently rotating pixel objects in camera space (port of objects.rs). Camera moves,
// ring deformation, flights and impacts are sampled once, when the film is built; every
// frame then just looks its objects up by index.
//
// The Rust code works in f32 and the object shader turns these values into texel lookups,
// so every operation here is rounded to f32 (`f`) in the same order, and sin/cos are
// glibc's: a last-bit difference in a rotation vector would otherwise move a texel edge
// by a pixel now and then.

import { animate, Easing, f, seconds, timeline } from './anim.js';
import { cosf as cos, sinf as sin } from './libm.js';

const PI = f(Math.PI);
const TAU = f(2 * Math.PI);
const add = (a, b) => f(a + b);
const sub = (a, b) => f(a - b);
const mul = (a, b) => f(a * b);
const div = (a, b) => f(a / b);

/** Frames of each featured object's flight out of the wheel and back (end inclusive). */
export const EXCURSIONS = [
  { start: 200, departure: 190, arrival: 205, returnStart: 214, returnEnd: 225 },
  { start: 237, departure: 227, arrival: 242, returnStart: 249, returnEnd: 259 },
  { start: 265, departure: 261, arrival: 270, returnStart: 280, returnEnd: 294 },
];

function turn(p, a, b, angle) {
  const s = sin(angle);
  const c = cos(angle);
  const q = p.slice();
  q[a] = sub(mul(c, p[a]), mul(s, p[b]));
  q[b] = add(mul(s, p[a]), mul(c, p[b]));
  return q;
}

const mix = (a, b, t) => add(a, mul(sub(b, a), t));

export class PixelObject {
  constructor(icon, center, size, angles, heat) {
    const rotate = (p) => turn(turn(turn(p, 0, 2, angles[0]), 1, 2, angles[1]), 0, 1, angles[2]);
    this.icon = icon;
    this.center = center.map(f);
    this.right = rotate([1, 0, 0]);
    this.down = rotate([0, 1, 0]);
    this.size = f(size);
    this.heat = f(heat);
    this.soot = 0;
    this.pixels = 32;
    this.angles = angles.map(f);
    this.withStretch([1, 1]);
  }

  clone() {
    const o = Object.create(PixelObject.prototype);
    Object.assign(o, this, {
      center: this.center.slice(),
      right: this.right.slice(),
      down: this.down.slice(),
      angles: this.angles.slice(),
      stretch: this.stretch.slice(),
      bounds: this.bounds.slice(),
    });
    return o;
  }

  /** The projected screen rectangle (with a 2px margin) that the object shader fills. */
  withStretch(stretch) {
    this.stretch = stretch.map(f);
    const low = [1440, 1080];
    const high = [0, 0];
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = [0, 1, 2].map((i) => add(
        this.center[i],
        mul(mul(add(mul(mul(x, this.right[i]), this.stretch[0]), mul(mul(y, this.down[i]), this.stretch[1])), this.size), 0.5),
      ));
      const screen = [add(720, div(mul(1250, p[0]), p[2])), add(540, div(mul(1250, p[1]), p[2]))];
      for (let i = 0; i < 2; i++) {
        low[i] = Math.min(low[i], screen[i]);
        high[i] = Math.max(high[i], screen[i]);
      }
    }
    const x = Math.max(0, Math.floor(sub(low[0], 2)));
    const y = Math.max(0, Math.floor(sub(low[1], 2)));
    const w = Math.min(1440, Math.ceil(add(high[0], 2))) - x;
    const h = Math.min(1080, Math.ceil(add(high[1], 2))) - y;
    this.bounds = [x, y, w, h];
    return this;
  }

  // Shared camera-space interpolation keeps the selected ring object alive through the edit.
  handoff(target, progress, lift) {
    const center = [0, 1, 2].map((i) => mix(this.center[i], target.center[i], progress));
    center[1] = sub(center[1], mul(sin(mul(progress, PI)), lift));
    const o = new PixelObject(
      this.icon,
      center,
      mix(this.size, target.size, progress),
      [0, 1, 2].map((i) => mix(this.angles[i], target.angles[i], progress)),
      mix(this.heat, target.heat, progress),
    );
    o.soot = mix(this.soot, target.soot, progress);
    o.pixels = mix(this.pixels, target.pixels, progress);
    return o.withStretch([0, 1].map((i) => mix(this.stretch[i], target.stretch[i], progress)));
  }

  // Continue the feature's last measured velocity through the background cut.
  continued(previous, elapsed) {
    const extend = (a, b) => add(a, mul(sub(a, b), elapsed));
    const o = new PixelObject(
      this.icon,
      [0, 1, 2].map((i) => extend(this.center[i], previous.center[i])),
      extend(this.size, previous.size),
      [0, 1, 2].map((i) => extend(this.angles[i], previous.angles[i])),
      this.heat,
    );
    o.soot = this.soot;
    o.pixels = this.pixels;
    return o.withStretch(this.stretch);
  }

  // Scale camera position and physical size together: the projected pose is identical,
  // but the flying icon clears the other ring objects.
  foreground(amount) {
    const ratio = add(1, mul(sub(div(Math.min(550, this.center[2]), this.center[2]), 1), amount));
    const o = new PixelObject(this.icon, this.center.map((v) => mul(v, ratio)), mul(this.size, ratio), this.angles, this.heat);
    o.soot = this.soot;
    o.pixels = this.pixels;
    return o.withStretch(this.stretch);
  }

  /** Shader uniforms for the object shader, plus the screen rectangle to fill. */
  layer() {
    return {
      rect: this.bounds,
      uniforms: {
        uCenter: this.center,
        uRight: this.right,
        uDown: this.down,
        uSize: this.size,
        uStretch: this.stretch,
        uCell: [(this.icon % 4) * 64, Math.floor(this.icon / 4) * 64],
        uHeat: this.heat,
        uSoot: this.soot,
        uPixels: this.pixels,
      },
    };
  }
}

const byDepth = (objects) => objects.sort((a, b) => b.center[2] - a.center[2]);

/**
 * Replace one permanent slot's occupant with a complete excursion, including the feature
 * hold. Feature cards show only the selected track; the hidden wheel keeps rotating so its
 * vacant slot remains the exact return target.
 */
export function ringExcursion(frames, heroes, schedule, keepSpinning) {
  const { start, departure, arrival, returnStart, returnEnd } = schedule;
  const outward = div(arrival - departure, 24);
  const back = div(returnEnd - returnStart, 24);
  const smooth = Easing.cubicBezier(0.42, 0, 0.58, 1);
  const pull = timeline([{ at: 0, end: outward, from: 0, to: 1, easing: smooth }]);
  const rejoin = timeline([{ at: 0, end: back, from: 0, to: 1, easing: smooth }]);
  const original = heroes.map((pose) => pose.foreground(1));
  const target = original[arrival - start].clone();
  const icon = target.icon;
  const end = start + heroes.length;
  const destination = frames[returnEnd].find((o) => o.icon === icon);
  if (!destination) return;
  const rollOffset = keepSpinning
    ? mul(Math.ceil(div(sub(original[returnStart - start].angles[2], destination.angles[2]), TAU)), TAU)
    : 0;
  for (let index = departure; index <= returnEnd; index++) {
    const objects = frames[index];
    const at = objects.findIndex((o) => o.icon === icon);
    if (at >= 0) {
      const slot = objects[at].clone();
      let pose;
      if (index <= arrival) {
        pose = slot.handoff(target, animate(pull, seconds(index - departure)), 90);
      } else if (index < returnStart) {
        pose = original[index - start].clone();
      } else {
        const source = index < end
          ? original[index - start].clone()
          : original[original.length - 1].continued(original[original.length - 2], index + 1 - end);
        slot.angles[2] = add(slot.angles[2], rollOffset);
        pose = source.handoff(slot, animate(rejoin, seconds(index - returnStart)), -55);
      }
      objects[at] = pose.clone();
      if (index >= start && index < end) heroes[index - start] = pose;
    }
    byDepth(objects);
  }
}

export function hero(icon, x, y, size, time) {
  return new PixelObject(
    icon,
    [sub(x, 720), sub(y, 540), 1250],
    size,
    [
      mul(sin(add(mul(time, 6), f(0.4))), f(0.8)),
      mul(f(0.15), cos(mul(time, 4))),
      add(f(-0.10), mul(sin(mul(time, f(2.7))), f(0.25))),
    ],
    0,
  );
}

function baseChoreography() {
  const tilt = timeline([
    { at: 6.541667, end: 7.291667, from: 0.34, to: 0.63, easing: Easing.cubicBezier(0.65, 0, 0.35, 1) },
    { at: 7.291667, end: 7.833333, from: 0.63, to: 0.50, easing: Easing.EaseInOut },
    { at: 7.833333, end: 8.333333, from: 0.50, to: 0.48, easing: Easing.EaseInOut },
    { at: 11.916667, end: 12.5, from: 0.48, to: 0.98, easing: Easing.cubicBezier(0.16, 1, 0.3, 1) },
  ]);
  const explode = timeline([
    { at: 12.583333, end: 13.0, from: 0, to: 1, easing: Easing.cubicBezier(0.16, 1, 0.3, 1) },
  ]);
  // Arrange the three featured objects along the approaching arc; keep angular velocity
  // continuous across the hero/background cuts.
  const frontAngle = f(1.95);
  const departureRotation = sub(add(frontAngle, mul(PI, 0.5)), div(mul(2, TAU), 12));
  const scatterRotation = add(departureRotation, div(302 - 190, 24));
  const spin = timeline([{
    at: div(153, 24),
    end: div(302, 24),
    from: add(departureRotation, div(153 - 190, 24)),
    to: scatterRotation,
    easing: Easing.Linear,
  }]);
  const order = [10, 7, 0, 6, 11, 9, 3, 2, 1, 4, 8, 5];
  const targets = [
    [0, -420], [150, -100], [420, -280], [350, 140], [530, 100], [520, 340],
    [-80, 30], [-360, 350], [-480, -130], [-360, -50], [-240, 70], [180, 200],
  ];
  const frames = [];
  for (let index = 0; index < 489; index++) {
    const t = seconds(index);
    const open = animate(explode, t);
    const plane = animate(tilt, t);
    const rotation = animate(spin, t);
    const objects = [];
    if (index >= 48 && index < 93) {
      const positions = [[735, 351], [1060, 348], [960, 665], [1120, 869]];
      [7, 1, 11, 0].forEach((icon, i) => {
        const local = index - 48;
        const phase = add(mul(local, f(0.11)), mul(i, f(2.3)));
        const x = add(positions[i][0], mul(sin(phase), 15));
        const y = add(positions[i][1], mul(cos(mul(phase, f(0.8))), 13));
        const object = new PixelObject(
          icon,
          [sub(x, 720), sub(y, 540), 1250],
          104,
          [mul(sin(mul(phase, f(0.82))), f(0.68)), f(0.12), mul(sin(phase), f(0.16))],
          0,
        );
        // The source briefly breaks these distant objects down into big mosaic pixels.
        object.pixels = index <= 54 ? 16
          : index >= 75 && index <= 77 ? 12
            : index >= 78 && index <= 81 ? 6
              : index >= 82 && index <= 84 ? 10
                : 32;
        objects.push(object);
      });
    } else if (index >= 153 && index < 331) {
      order.forEach((icon, i) => {
        const a = sub(add(div(mul(i, TAU), 12), rotation), mul(PI, 0.5));
        const s = sin(a);
        const c = cos(a);
        const radius = 355;
        let x = mul(c, radius);
        let y = mul(mul(s, radius), plane);
        let z = sub(1250, mul(mul(s, 600), f(Math.sqrt(sub(1, mul(plane, plane))))));
        // Explosion retains tangential momentum; pieces then drift and tumble.
        if (open > 0) {
          const a0 = sub(add(div(mul(i, TAU), 12), scatterRotation), mul(PI, 0.5));
          const drift = Math.max(sub(t, 13), 0);
          x = add(add(mul(mul(cos(a0), radius), sub(1, open)), mul(targets[i][0], open)), mul(mul(drift, 45), sin(a0)));
          y = add(add(mul(mul(mul(sin(a0), radius), f(0.98)), sub(1, open)), mul(targets[i][1], open)), mul(mul(drift, 32), cos(a0)));
          z = add(1250, mul(mul(open, sin(mul(i, f(3.7)))), 140));
        }
        const roll = add(
          mul(sin(add(mul(t, f(0.9)), i)), f(0.12)),
          mul(mul(mul(open, sub(t, f(12.58))), sub(i, 5)), f(0.17)),
        );
        const yaw = add(
          mul(sin(add(mul(t, f(1.05)), mul(i, f(1.7)))), f(0.35)),
          mul(mul(open, sub(t, f(12.58))), f(0.75)),
        );
        const heat = index < 157
          ? sub(1, mul(index - 153, f(0.14)))
          : icon === 3 || icon === 5
            ? mul(Math.max(sub(sin(add(mul(t, 3), i)), f(0.85)), 0), 4)
            : 0;
        objects.push(new PixelObject(icon, [x, y, z], sub(195, mul(open, 35)), [yaw, f(0.1), roll], heat));
      });
    }
    frames.push(byDepth(objects));
  }
  return frames;
}

/** Frame-by-frame objects (farthest first) and the six ring collisions. */
export function choreography() {
  const frames = baseChoreography();
  const impacts = [];
  // Pick the object at each reference contact point so the nib, flare and response all
  // use one event.
  for (const [at, desired, direction] of [
    [172, [1045, 592], [0.65, 0.6]],
    [177, [767, 659], [0.0, 1.0]],
    [182, [425, 671], [-0.75, 0.65]],
    [188, [340, 487], [-0.91, -0.41]],
    [312, [1080, 575], [0.45, 0.9]],
    [318, [400, 878], [-0.9, -0.1]],
  ]) {
    const last = impacts[impacts.length - 1];
    const distance = (o) => {
      const x = sub(720, -div(mul(o.center[0], 1250), o.center[2]));
      const y = sub(540, -div(mul(o.center[1], 1250), o.center[2]));
      return add(mul(sub(x, desired[0]), sub(x, desired[0])), mul(sub(y, desired[1]), sub(y, desired[1])));
    };
    let nearest = null;
    for (const o of frames[at]) {
      if (last && last.icon === o.icon) continue;
      if (!nearest || distance(o) < distance(nearest)) nearest = o;
    }
    if (nearest) {
      impacts.push({
        at,
        icon: nearest.icon,
        direction: direction.map(f),
        position: desired,
        approach: [
          sub(div(mul(desired[0] - 720, nearest.center[2]), 1250), nearest.center[0]),
          sub(div(mul(desired[1] - 540, nearest.center[2]), 1250), nearest.center[1]),
        ],
      });
    }
  }
  const response = timeline([
    { at: 0, end: 0.083333, from: 0, to: 1, easing: Easing.EaseOut },
    { at: 0.083333, from: 1, to: 0, easing: Easing.spring(1, 190, 14) },
  ]);
  const approach = timeline([
    { at: 0, end: 0.125, from: 0, to: 1, easing: Easing.EaseInOut },
    { at: 0.125, end: 0.75, from: 1, to: 0, easing: Easing.EaseOut },
  ]);
  frames.forEach((objects, index) => {
    objects.forEach((object, k) => {
      const center = object.center.slice();
      const angles = object.angles.slice();
      let heat = object.heat;
      let soot = 0;
      for (const hit of impacts) {
        if (hit.icon !== object.icon || index + 3 < hit.at || index > hit.at + 25) continue;
        const arrive = animate(approach, seconds(index + 3 - hit.at));
        center[0] = add(center[0], mul(hit.approach[0], arrive));
        center[1] = add(center[1], mul(hit.approach[1], arrive));
        if (index < hit.at) continue;
        const elapsed = index - hit.at;
        const kick = animate(response, seconds(elapsed));
        center[0] = add(center[0], mul(mul(hit.direction[0], 98), kick));
        center[1] = add(center[1], mul(mul(hit.direction[1], 72), kick));
        center[2] = sub(center[2], mul(85, kick));
        angles[0] = add(angles[0], mul(kick, f(0.84)));
        angles[2] = add(angles[2], mul(mul(kick, hit.direction[0]), f(0.43)));
        heat = Math.max(heat, mul(Math.max(sub(1, div(elapsed, 5)), 0), f(0.83)));
        soot = Math.max(
          soot,
          mul(mul(
            Math.min(1, Math.max(0, div(elapsed - 3, 4))),
            Math.max(sub(1, div(Math.max(elapsed - 11, 0), 12)), 0),
          ), f(0.92)),
        );
      }
      const replaced = new PixelObject(object.icon, center, object.size, angles, heat);
      replaced.soot = soot;
      replaced.pixels = object.pixels;
      objects[k] = replaced;
    });
    byDepth(objects);
  });
  return { frames, impacts };
}
