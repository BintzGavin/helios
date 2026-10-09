// Feature cards "code." / "motion." / "feeling." (port of hero.rs). The cached hero poses
// share the ring trajectories, so the selected icon flies out of the wheel, holds, and
// docks back into its still-moving slot.

import { animate, Easing, f, seconds, timeline, Transform, transformTimeline } from './anim.js';
import { CAMERA_POSE } from './captures.js';
import { EXCURSIONS, PixelObject, ringExcursion } from './objects.js';

export const Card = { Code: 'code', Motion: 'motion', Feeling: 'feeling' };

function motionExposures() {
  const arrive = timeline([
    { at: 0, end: 0.166667, from: 0, to: 1, easing: Easing.cubicBezier(0.12, 0.9, 0.22, 1) },
  ]);
  // Interpolate between the measured silhouettes instead of holding each exposure.
  const normal = CAMERA_POSE[5];
  const tall = CAMERA_POSE[12];
  const flat = CAMERA_POSE[17];
  const smooth = Easing.cubicBezier(0.42, 0, 0.58, 1);
  const deformation = [0, 1, 2].map((axis) => timeline([
    { at: 5 / 24, end: 10 / 24, from: normal[axis], to: tall[axis], easing: smooth },
    { at: 10 / 24, end: 15 / 24, from: tall[axis], to: flat[axis], easing: smooth },
  ]));
  return Array.from({ length: 16 }, (_, index) => {
    const t = seconds(index);
    const entry = animate(arrive, t);
    const [sx, sy, roll] = deformation.map((curve) => animate(curve, t));
    const wide = Math.min(1, Math.max(0, f(f(sx - 1) / f(1.2))));
    const rest = f(1 - entry);
    const object = new PixelObject(
      5,
      [f(f(-296 + f(wide * 25)) - f(rest * 60)), f(-8 + f(rest * 74)), 1250],
      f(470 * f(f(0.83) + f(entry * f(0.17)))),
      [f(0.10), f(0.035), roll],
      0,
    ).withStretch([sx, sy]);
    return { object, titleOpacity: 1 };
  });
}

export class Heroes {
  constructor(objects) {
    const arrival = timeline([
      { at: 0, end: 0.208333, from: 0, to: 1, easing: Easing.cubicBezier(0.12, 0.9, 0.22, 1) },
    ]);
    const push = timeline([
      { at: 0.208333, end: 0.583333, from: 0, to: 0.25, easing: Easing.Linear },
      { at: 0.583333, end: 0.875, from: 0.25, to: 1, easing: Easing.EaseIn },
    ]);
    const yaw = timeline([
      { at: 0, end: 0.166667, from: -0.85, to: -0.28, easing: Easing.cubicBezier(0.16, 1, 0.3, 1) },
      { at: 0.166667, end: 0.833333, from: -0.28, to: 0.40, easing: Easing.EaseInOut },
    ]);
    const spin = timeline([{ at: 0, end: 0.875, from: -0.38, to: 2.95, easing: Easing.Linear }]);
    const build = (feeling) => Array.from({ length: feeling ? 21 : 20 }, (_, index) => {
      const t = seconds(index);
      const entry = animate(arrival, t);
      const p = animate(push, t);
      const y = animate(yaw, t);
      const rest = f(1 - entry);
      const object = new PixelObject(
        feeling ? 4 : 0,
        [f(-278 - f(rest * 74)), f(-9 + f(rest * 68)), f(1250 - f(p * 70))],
        f((feeling ? 555 : 530) * f(f(0.82) + f(entry * f(0.18)))),
        [
          feeling ? f(y * f(0.6)) : y,
          f(f(0.16) - f(p * f(0.20))),
          feeling ? animate(spin, t) : f(f(f(-0.15) + f(entry * f(0.05))) + f(p * f(0.13))),
        ],
        0,
      );
      return { object, titleOpacity: 1 };
    });
    this.code = build(false);
    this.feeling = build(true);
    this.motion = motionExposures();

    [[this.code, false], [this.motion, false], [this.feeling, true]].forEach(([exposures, keepSpinning], k) => {
      const schedule = EXCURSIONS[k];
      const poses = exposures.map((e) => e.object.clone());
      ringExcursion(objects, poses, schedule, keepSpinning);
      const arrive = f(f(schedule.arrival - schedule.start) / 24);
      const exit = f(f(schedule.returnStart - schedule.start) / 24);
      const caption = timeline([
        { at: f(arrive - f(2 / 24)), end: arrive, from: 0, to: 1, easing: Easing.EaseOut },
        { at: exit, end: f(exit + f(3 / 24)), from: 1, to: 0, easing: Easing.EaseInOut },
      ]);
      exposures.forEach((exposure, index) => {
        exposure.object = poses[index];
        exposure.titleOpacity = animate(caption, seconds(index));
      });
    });
  }

  exposure(card, index) {
    const list = this[card];
    return list[Math.min(index, list.length - 1)];
  }
}

const titleSlide = transformTimeline([{
  at: 0, end: 0.166667, from: Transform.translate(48, 18), to: Transform.translate(0, 0),
  easing: Easing.cubicBezier(0.12, 1, 0.25, 1),
}]);
const cursorWidth = timeline([{ at: 0, end: 0.125, from: 76, to: 6, easing: Easing.EaseOut }]);
const subtitleSlide = transformTimeline([{
  at: 0.041667, end: 0.25, from: Transform.translate(0, 24), to: Transform.translate(0, 0),
  easing: Easing.cubicBezier(0.16, 1, 0.3, 1),
}]);
const subtitleFade = timeline([{ at: 0.041667, end: 0.166667, from: 0, to: 1, easing: Easing.EaseOut }]);

/** Each card's title and the x of the cursor after it. */
export const TITLES = {
  code: ['code.', 1120],
  motion: ['motion.', 1256],
  feeling: ['feeling.', 1246],
};

/** The card's title block, as a list of draw steps for the painter. */
export function typeBlock(t, card, titles = TITLES) {
  const [copy, cursor] = titles[card];
  return {
    titleTransform: animate(titleSlide, t),
    copy,
    cursor: { x: cursor, y: 477, height: 86, width: animate(cursorWidth, t) },
    subtitleTransform: animate(subtitleSlide, t),
    subtitleOpacity: animate(subtitleFade, t),
  };
}
