/**
 * cursor: a scripted mouse pointer whose clicks land on the times you give.
 *
 * A script is a list of actions, and each action's `t` is the moment of its key event: when a
 * `move` arrives, when a `click` or `down` presses, when an `up` lets go. So a click can land on
 * a beat. The script is compiled once; after that the pointer at any time is a pure function of
 * `t`, so frames render the same in any order and on any worker.
 *
 * - Moves are human reaches: a minimum-jerk speed profile (10τ³ − 15τ⁴ + 6τ⁵) along a slightly
 *   curved path, a few pixels of overshoot and a settle onto the target. Without a `duration`, a
 *   move takes as long as Fitts' law gives (see `fittsDuration`).
 * - An action with `at` reaches it 70 ms before its key event. A click presses at `t` and
 *   releases 80–120 ms later.
 * - The curve, the overshoot and the release time are seeded from the action's index: the same
 *   script gives the same pixels every time.
 *
 *   import { createCursor } from './cursor';
 *
 *   const center = (el: Element) => () => {
 *     const r = el.getBoundingClientRect();
 *     return [r.left + r.width / 2, r.top + r.height / 2] as const;
 *   };
 *   const cursor = createCursor([
 *     { type: 'move', t: 0.9, to: [640, 360] },
 *     { type: 'click', t: 1.38, at: [912, 540] },          // press on a beat
 *     { type: 'click', t: 2.30, at: center(saveButton) },  // a DOM element, read each frame
 *   ], { start: [1500, 900] });
 *
 *   window.renderAt = (t) => {
 *     drawScene(ctx, t);
 *     cursor.draw(ctx, t);  // or cursor.apply(pointerElement, t) on a DOM page
 *   };
 */

export type Point = readonly [number, number];

/**
 * A point, or a function that returns one for time `t`. A function is called on every query
 * with that frame's time, so the pointer homes in on a target that moves; a DOM page can return
 * the centre of an element's current rect.
 */
export type Target = Point | ((t: number) => Point);

interface Timing {
  /** Seconds the reach takes. Default: Fitts' law for the distance and `width`. */
  duration?: number;
  /** Size of the target along the reach, in px, for Fitts' law. Default 40. */
  width?: number;
}

export type CursorAction =
  | ({ type: 'move'; t: number; to: Target } & Timing)
  | ({ type: 'click' | 'down' | 'up'; t: number; at?: Target } & Timing);

export interface CursorOptions {
  /** Where the pointer rests before its first reach. Default: the first action's target. */
  start?: Target;
  /** Any integer; changes every curve, overshoot and release while keeping the timing. */
  seed?: number;
}

export interface CursorState {
  x: number;
  y: number;
  /** The button is down: during a click, or between a `down` and an `up`. */
  pressed: boolean;
  /** The click being pressed, counting clicks from 0, and how far from press (0) to release (1). */
  click: { index: number; progress: number } | null;
}

export interface DrawOptions {
  /** Size of the arrow: 1 is the classic 12 × 20 px pointer in the canvas's units. Default 1. */
  scale?: number;
  /** Default '#fff'. */
  fill?: string;
  /** Default '#000'. */
  stroke?: string;
  /** A soft drop shadow, or false for none. Default true. */
  shadow?: boolean;
  /** Scale of the arrow while the button is down, around its tip. Default 0.9; 1 for none. */
  pressedScale?: number;
}

export interface Cursor {
  /** Each click's press and release, in seconds. */
  readonly clicks: readonly { t: number; release: number }[];
  /** Where the pointer is at `t` and whether the button is down. */
  at(t: number): CursorState;
  /** Draws the pointer with its tip at `at(t)`, on whole device pixels. */
  draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, t: number, options?: DrawOptions): void;
  /**
   * Moves an element to `at(t)` with a CSS transform and sets `data-pressed`. Put the element at
   * the page's top left (`position: fixed; left: 0; top: 0`) with the pointer's tip at its
   * corner, for example an `<svg>` of `ARROW_PATH`.
   */
  apply(el: HTMLElement, t: number, options?: Pick<DrawOptions, 'pressedScale'>): void;
}

/** Fitts' law intercept, seconds: the time any reach takes, however short. */
export const FITTS_A = 0.1;
/**
 * Fitts' law slope, seconds per bit, in the 0.1–0.2 s/bit range measured for mouse pointing.
 * With the default 40 px target, 100 px takes 0.37 s, 400 px 0.62 s and 800 px 0.76 s.
 */
export const FITTS_B = 0.15;
const DEFAULT_WIDTH = 40;
/** A pointer rests this long on its target before pressing or letting go. */
const DWELL = 0.07;
const RELEASE_MIN = 0.08;
const RELEASE_MAX = 0.12;
/** Share of a reach spent on the main movement; the rest settles back from the overshoot. */
const PRIMARY = 0.8;
/** Overshoot is 4% of the distance, at most 6 px, scaled by a seeded 0.5–1. */
const OVERSHOOT_RATIO = 0.04;
const OVERSHOOT_MAX = 6;
/** The path bows sideways by 2–6% of the distance at its middle, to a seeded side. */
const CURVE_MIN = 0.02;
const CURVE_MAX = 0.06;

/** The classic arrow, tip at (0, 0), as x, y pairs in px. */
const ARROW = [0, 0, 0, 16, 4, 12, 7, 19, 10, 18, 7, 11, 11, 11];
/** The arrow as an SVG path, tip at (0, 0), for a DOM pointer. */
export const ARROW_PATH = ARROW.map((v, i) => (i % 2 ? ` ${v}` : `${i ? 'L' : 'M'}${v}`)).join('') + 'Z';

/** Seconds a reach of `distance` px to a target `width` px wide takes: a + b·log2(D/W + 1). */
export function fittsDuration(distance: number, width = DEFAULT_WIDTH): number {
  return FITTS_A + FITTS_B * Math.log2(Math.max(0, distance) / Math.max(width, 1) + 1);
}

interface Step {
  t: number;
  /** Where this action reaches, or null to stay where the pointer is. */
  to: Target | null;
  /** Where the pointer rests once this action is done. */
  rest: Target;
  /** When the reach must arrive. */
  arrive: number;
  /** The reach can't start before this: the previous action's release. */
  earliest: number;
  /** When the button comes back up after a click; `t` for other actions. */
  release: number;
  duration: number | undefined;
  width: number;
  /** The click's number, or -1. */
  click: number;
  /** The button is held after this action (between a down and an up). */
  held: boolean;
  /** Seeded: sideways bow as a share of the distance, signed. */
  curve: number;
  /** Seeded: share of the maximum overshoot, 0.5–1. */
  overshoot: number;
}

export function createCursor(script: readonly CursorAction[], options: CursorOptions = {}): Cursor {
  const seed = options.seed ?? 0;
  script.forEach((action, i) => {
    if (!Number.isFinite(action.t)) throw new Error(`Cursor action ${i} (${action.type}) has no time: give it a "t" in seconds.`);
    if (action.type === 'move' && !action.to) throw new Error(`Cursor move at ${action.t} s has no target: give it "to: [x, y]".`);
  });
  const actions = script.slice().sort((a, b) => a.t - b.t);
  const targetOf = (action: CursorAction): Target | null => (action.type === 'move' ? action.to : action.at ?? null);

  let start: Target = [0, 0];
  if (options.start) start = options.start;
  else {
    const first = actions.map(targetOf).find((target) => target !== null);
    if (first) start = first;
  }

  const steps: Step[] = [];
  let clickCount = 0;
  actions.forEach((action, i) => {
    const previous = steps[i - 1];
    const to = targetOf(action);
    const earliest = previous ? previous.release : -Infinity;
    const arrive = action.type === 'move' || !to ? action.t : action.t - DWELL;
    let release = action.t;
    if (action.type === 'click') {
      release = action.t + RELEASE_MIN + (RELEASE_MAX - RELEASE_MIN) * rand(i, 1, seed);
      // Let go before the next action, even when it comes quickly (a double click).
      const following = actions[i + 1];
      if (following) release = Math.min(release, action.t + (following.t - action.t) / 2);
    }
    const side = rand(i, 2, seed) < 0.5 ? -1 : 1;
    steps.push({
      t: action.t,
      to,
      rest: to ?? previous?.rest ?? start,
      arrive: Math.min(Math.max(arrive, earliest), action.t),
      earliest,
      release,
      duration: action.duration,
      width: action.width ?? DEFAULT_WIDTH,
      click: action.type === 'click' ? clickCount++ : -1,
      held: action.type === 'down' ? true : action.type === 'up' ? false : previous?.held ?? false,
      curve: side * (CURVE_MIN + (CURVE_MAX - CURVE_MIN) * rand(i, 3, seed)),
      overshoot: 0.5 + 0.5 * rand(i, 4, seed),
    });
  });
  const keys = steps.map((step) => step.t);
  const clicks = steps.filter((step) => step.click >= 0).map((step) => ({ t: step.t, release: step.release }));

  const at = (t: number): CursorState => {
    const k = upperBound(keys, t);
    const done = k > 0 ? steps[k - 1] : null;
    const next = k < steps.length ? steps[k] : null;
    const [fromX, fromY] = resolve(done ? done.rest : start, t);
    let x = fromX;
    let y = fromY;

    if (next && next.to) {
      const [toX, toY] = resolve(next.to, t);
      const distance = Math.hypot(toX - fromX, toY - fromY);
      const duration = next.duration ?? fittsDuration(distance, next.width);
      const begin = Math.max(next.arrive - duration, next.earliest);
      if (t >= next.arrive) {
        x = toX;
        y = toY;
      } else if (t >= begin && distance > 0) {
        const u = (t - begin) / (next.arrive - begin);
        const ux = (toX - fromX) / distance;
        const uy = (toY - fromY) / distance;
        const over = Math.min(OVERSHOOT_MAX, OVERSHOOT_RATIO * distance) * next.overshoot;
        const endX = toX + ux * over;
        const endY = toY + uy * over;
        if (u < PRIMARY) {
          const s = minimumJerk(u / PRIMARY);
          const bow = next.curve * distance * 4 * s * (1 - s);
          x = fromX + (endX - fromX) * s - uy * bow;
          y = fromY + (endY - fromY) * s + ux * bow;
        } else {
          const s = minimumJerk((u - PRIMARY) / (1 - PRIMARY));
          x = endX + (toX - endX) * s;
          y = endY + (toY - endY) * s;
        }
      }
    }

    const clicking = done !== null && done.click >= 0 && t < done.release;
    return {
      x,
      y,
      pressed: clicking || (done?.held ?? false),
      click: clicking ? { index: done.click, progress: (t - done.t) / (done.release - done.t) } : null,
    };
  };

  const draw = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, t: number, drawOptions: DrawOptions = {}) => {
    const { scale = 1, fill = '#fff', stroke = '#000', shadow = true, pressedScale = 0.9 } = drawOptions;
    const state = at(t);
    const m = ctx.getTransform();
    // The tip in device pixels, rounded so the arrow lands on the pixel grid. The arrow keeps
    // the canvas's scale but not its rotation or skew.
    const tipX = Math.round(m.a * state.x + m.c * state.y + m.e);
    const tipY = Math.round(m.b * state.x + m.d * state.y + m.f);
    const size = scale * Math.hypot(m.a, m.b) * (state.pressed ? pressedScale : 1);
    // A one-unit outline is `size` device pixels wide: offset it so straight edges are crisp.
    const offset = (size / 2) % 1;

    ctx.save();
    ctx.setTransform(size, 0, 0, size, tipX + offset, tipY + offset);
    ctx.beginPath();
    ctx.moveTo(ARROW[0], ARROW[1]);
    for (let i = 2; i < ARROW.length; i += 2) ctx.lineTo(ARROW[i], ARROW[i + 1]);
    ctx.closePath();
    if (shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 2 * size;
      ctx.shadowOffsetX = size;
      ctx.shadowOffsetY = size;
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  };

  const apply = (el: HTMLElement, t: number, applyOptions: Pick<DrawOptions, 'pressedScale'> = {}) => {
    const { pressedScale = 0.9 } = applyOptions;
    const state = at(t);
    const ratio = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const x = Math.round(state.x * ratio) / ratio;
    const y = Math.round(state.y * ratio) / ratio;
    el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${x}px, ${y}px)${state.pressed && pressedScale !== 1 ? ` scale(${pressedScale})` : ''}`;
    el.dataset.pressed = String(state.pressed);
  };

  return { clicks, at, draw, apply };
}

function resolve(target: Target, t: number): Point {
  return typeof target === 'function' ? target(t) : target;
}

/** Position along a reach for time share `u` (0–1): zero speed and acceleration at both ends. */
function minimumJerk(u: number): number {
  return u * u * u * (10 - 15 * u + 6 * u * u);
}

/** A number in [0, 1) from the action index, a salt for each use, and the cursor's seed. */
function rand(index: number, salt: number, seed: number): number {
  let h = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca77) ^ Math.imul(seed | 0, 0xc2b2ae3d);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The first index whose value is greater than `value` (list sorted ascending). */
function upperBound(list: readonly number[], value: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (list[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
