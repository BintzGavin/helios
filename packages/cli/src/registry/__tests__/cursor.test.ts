import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARROW_PATH, FITTS_A, FITTS_B, createCursor, fittsDuration, type CursorAction, type Point } from '../components/cursor.js';

const DWELL = 0.07;
const OVERSHOOT_MAX = 6;

/** How far past `to` the pointer is along the reach from `from`, and how far to the side. */
function offsets(p: { x: number; y: number }, from: Point, to: Point) {
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ux = (to[0] - from[0]) / d;
  const uy = (to[1] - from[1]) / d;
  return { past: (p.x - to[0]) * ux + (p.y - to[1]) * uy, side: Math.abs(-(p.x - from[0]) * uy + (p.y - from[1]) * ux) };
}

describe('cursor', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('timing', () => {
    const script: CursorAction[] = [
      { type: 'move', t: 1, to: [400, 300] },
      { type: 'click', t: 2, at: [900, 620] },
      { type: 'click', t: 3 },
      { type: 'move', t: 4.25, to: [100, 900], duration: 0.5 },
    ];
    const cursor = createCursor(script, { start: [1500, 100] });

    it('arrives exactly at each action time', () => {
      expect(cursor.at(1)).toMatchObject({ x: 400, y: 300 });
      expect(cursor.at(2 - DWELL)).toMatchObject({ x: 900, y: 620 });
      expect(cursor.at(2)).toMatchObject({ x: 900, y: 620 });
      expect(cursor.at(3)).toMatchObject({ x: 900, y: 620 });
      expect(cursor.at(4.25)).toMatchObject({ x: 100, y: 900 });
      expect(cursor.at(99)).toMatchObject({ x: 100, y: 900 });
      // Just before arriving it is close but not there yet: it is settling from the overshoot.
      const before = cursor.at(1 - 0.001);
      expect(Math.hypot(before.x - 400, before.y - 300)).toBeLessThan(0.1);
      expect(before.x === 400 && before.y === 300).toBe(false);
    });

    it('rests at the start until the first reach begins, which takes as long as Fitts says', () => {
      const duration = fittsDuration(Math.hypot(1500 - 400, 100 - 300));
      expect(cursor.at(0)).toMatchObject({ x: 1500, y: 100, pressed: false, click: null });
      expect(cursor.at(1 - duration - 0.001)).toMatchObject({ x: 1500, y: 100 });
      const started = cursor.at(1 - duration + 0.02);
      expect(started.x).toBeLessThan(1500);
      expect(started.x).toBeGreaterThan(1400);
    });

    it('takes a given duration', () => {
      expect(cursor.at(3.75 - 0.001)).toMatchObject({ x: 900, y: 620 });
      expect(cursor.at(3.75 + 0.05).x).toBeLessThan(900);
    });

    it('presses at the action time and releases 80–120 ms later', () => {
      expect(cursor.clicks).toHaveLength(2);
      for (const [index, { t, release }] of cursor.clicks.entries()) {
        expect(release - t).toBeGreaterThanOrEqual(0.08);
        expect(release - t).toBeLessThanOrEqual(0.12);
        expect(cursor.at(t - 1e-6)).toMatchObject({ pressed: false, click: null });
        expect(cursor.at(t)).toMatchObject({ pressed: true, click: { index, progress: 0 } });
        const halfway = cursor.at((t + release) / 2);
        expect(halfway.pressed).toBe(true);
        expect(halfway.click?.index).toBe(index);
        expect(halfway.click?.progress).toBeCloseTo(0.5, 9);
        expect(cursor.at(release - 1e-6).pressed).toBe(true);
        expect(cursor.at(release)).toMatchObject({ pressed: false, click: null });
      }
      // Each click lets go after its own seeded delay.
      const [a, b] = cursor.clicks;
      expect(a.release - a.t).not.toBe(b.release - b.t);
    });

    it('lets go of a quick double click before the second press', () => {
      const double = createCursor([{ type: 'click', t: 1, at: [10, 10] }, { type: 'click', t: 1.1 }]);
      const [first, second] = double.clicks;
      expect(first.release).toBeLessThanOrEqual(1.05);
      expect(double.at(1.06).pressed).toBe(false);
      expect(second.t).toBe(1.1);
      expect(double.at(1.1).click).toEqual({ index: 1, progress: 0 });
    });

    it('never starts a reach before the previous click has let go', () => {
      const quick = createCursor([{ type: 'click', t: 1, at: [0, 0] }, { type: 'move', t: 1.2, to: [800, 0] }]);
      const release = quick.clicks[0].release;
      expect(quick.at(release - 1e-6)).toMatchObject({ x: 0, y: 0, pressed: true });
      expect(quick.at(release + 0.01).x).toBeGreaterThan(0);
      expect(quick.at(1.2)).toMatchObject({ x: 800, y: 0 });
    });

    it('holds the button from a down to an up, dragging in between', () => {
      const drag = createCursor([
        { type: 'down', t: 1, at: [100, 100] },
        { type: 'move', t: 2, to: [700, 400] },
        { type: 'up', t: 2.2 },
      ]);
      expect(drag.at(0.99).pressed).toBe(false);
      expect(drag.at(1)).toMatchObject({ x: 100, y: 100, pressed: true, click: null });
      expect(drag.at(1.6).pressed).toBe(true);
      expect(drag.at(2)).toMatchObject({ x: 700, y: 400, pressed: true });
      expect(drag.at(2.2)).toMatchObject({ x: 700, y: 400, pressed: false });
      expect(drag.clicks).toEqual([]);
    });

    it('plays a script given out of order in time order', () => {
      const shuffled = createCursor([script[2], script[0], script[3], script[1]], { start: [1500, 100] });
      for (let t = 0; t < 5; t += 0.05) expect(shuffled.at(t)).toEqual(cursor.at(t));
    });

    it('explains a script it cannot play', () => {
      expect(() => createCursor([{ type: 'click', t: Number.NaN }])).toThrow('Cursor action 0 (click) has no time');
      expect(() => createCursor([{ type: 'move', t: 1 } as CursorAction])).toThrow('Cursor move at 1 s has no target');
    });
  });

  describe('Fitts duration', () => {
    it('grows with distance and shrinks with target size', () => {
      let previous = fittsDuration(0);
      expect(previous).toBe(FITTS_A);
      for (let d = 5; d <= 4000; d += 5) {
        const duration = fittsDuration(d);
        expect(duration).toBeGreaterThan(previous);
        previous = duration;
      }
      expect(fittsDuration(400, 80)).toBeLessThan(fittsDuration(400, 20));
      expect(fittsDuration(100)).toBeCloseTo(FITTS_A + FITTS_B * Math.log2(100 / 40 + 1), 12);
      expect(fittsDuration(100)).toBeCloseTo(0.371, 3);
      expect(fittsDuration(800)).toBeCloseTo(0.759, 3);
    });
  });

  describe('reach', () => {
    it('overshoots by a few pixels at most and bows only slightly', () => {
      const distances = [20, 120, 400, 900, 1800];
      for (const distance of distances) {
        for (let seed = 0; seed < 12; seed++) {
          const from: Point = [100, 500];
          const to: Point = [100 + distance * 0.8, 500 - distance * 0.6];
          const cursor = createCursor([{ type: 'move', t: 5, to }], { start: from, seed });
          let maxPast = -Infinity;
          let maxSide = 0;
          for (let t = 3; t <= 5; t += 0.002) {
            const { past, side } = offsets(cursor.at(t), from, to);
            maxPast = Math.max(maxPast, past);
            maxSide = Math.max(maxSide, side);
          }
          expect(maxPast).toBeLessThanOrEqual(Math.min(OVERSHOOT_MAX, 0.04 * distance) + 1e-9);
          expect(maxPast).toBeGreaterThan(0);
          expect(maxSide).toBeLessThanOrEqual(0.06 * distance + 1e-9);
          expect(maxSide).toBeGreaterThan(0.015 * distance);
        }
      }
    });

    it('starts and arrives at rest: minimum jerk', () => {
      const cursor = createCursor([{ type: 'move', t: 2, to: [1000, 0], duration: 1 }], { start: [0, 0] });
      const speed = (t: number) => Math.hypot(cursor.at(t + 1e-4).x - cursor.at(t).x, cursor.at(t + 1e-4).y - cursor.at(t).y) / 1e-4;
      expect(speed(1)).toBeLessThan(1);
      expect(speed(1.4)).toBeGreaterThan(1000);
      expect(speed(2 - 2e-4)).toBeLessThan(1);
    });

    it('seeds the curve from the action index and the seed, never the clock', () => {
      const script: CursorAction[] = [{ type: 'move', t: 1, to: [800, 400] }, { type: 'move', t: 2, to: [100, 400] }];
      const a = createCursor(script, { start: [0, 0] });
      const b = createCursor(script, { start: [0, 0] });
      const c = createCursor(script, { start: [0, 0], seed: 7 });
      expect(a.at(0.7)).toEqual(b.at(0.7));
      expect(a.at(0.7)).not.toEqual(c.at(0.7));
      expect(c.at(1)).toEqual(a.at(1));
    });
  });

  it('follows a target that moves, reaching where it is at the action time', () => {
    const target = vi.fn((t: number): Point => [200 + 100 * t, 300]);
    const cursor = createCursor([{ type: 'move', t: 2, to: target }], { start: [0, 0] });
    expect(cursor.at(2)).toMatchObject({ x: 400, y: 300 });
    expect(target).toHaveBeenLastCalledWith(2);
    expect(cursor.at(3)).toMatchObject({ x: 500, y: 300 });
  });

  it('is a pure function of t: same answer every time, in any order', () => {
    const cursor = createCursor([
      { type: 'move', t: 0.8, to: [640, 360] },
      { type: 'click', t: 1.38, at: [912, 540] },
      { type: 'down', t: 2.3, at: [300, 200] },
      { type: 'move', t: 3.1, to: (t) => [1200 + 40 * Math.sin(t), 700] },
      { type: 'up', t: 3.3 },
      { type: 'click', t: 3.76, at: [80, 80] },
    ], { start: [1500, 900], seed: 3 });
    const times = Array.from({ length: 300 }, (_, i) => i / 60);
    const inOrder = times.map((t) => cursor.at(t));
    const order = times.map((_, i) => (i * 77) % times.length);
    for (const i of order) expect(cursor.at(times[i])).toEqual(inOrder[i]);
    for (const i of order.reverse()) expect(cursor.at(times[i])).toEqual(inOrder[i]);
  });

  describe('drawing', () => {
    function fakeContext(transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) {
      const calls: { name: string; args: unknown[] }[] = [];
      const record = (name: string) => (...args: unknown[]) => { calls.push({ name, args }); };
      const ctx = {
        getTransform: () => transform,
        save: record('save'), restore: record('restore'), setTransform: record('setTransform'),
        beginPath: record('beginPath'), moveTo: record('moveTo'), lineTo: record('lineTo'), closePath: record('closePath'),
        fill: record('fill'), stroke: record('stroke'),
      };
      return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
    }

    it('draws the arrow with its tip on a whole device pixel', () => {
      const cursor = createCursor([{ type: 'move', t: 1, to: [100.3, 50.6] }]);
      const { ctx, calls } = fakeContext({ a: 1.5, b: 0, c: 0, d: 1.5, e: 10.2, f: 0 });
      cursor.draw(ctx, 2, { shadow: false });
      const [size, , , , x, y] = calls.find((call) => call.name === 'setTransform')!.args as number[];
      expect(size).toBe(1.5);
      // 1.5 × 100.3 + 10.2 = 160.65 → 161, 1.5 × 50.6 = 75.9 → 76, plus the outline's offset.
      expect(x - (size / 2) % 1).toBe(161);
      expect(y - (size / 2) % 1).toBe(76);
      expect(calls.filter((call) => call.name === 'lineTo')).toHaveLength(6);
      expect(calls.map((call) => call.name)).toEqual(expect.arrayContaining(['save', 'fill', 'stroke', 'restore']));
    });

    it('shrinks the arrow around its tip while pressed', () => {
      const cursor = createCursor([{ type: 'click', t: 1, at: [10, 10] }]);
      const { ctx, calls } = fakeContext();
      cursor.draw(ctx, 1.01, { scale: 2 });
      const [size, , , , x] = calls.find((call) => call.name === 'setTransform')!.args as number[];
      expect(size).toBeCloseTo(1.8, 12);
      expect(x - (size / 2) % 1).toBe(10);
    });

    it('moves a DOM element with a transform', () => {
      vi.stubGlobal('devicePixelRatio', 2);
      const el = { style: {} as Record<string, string>, dataset: {} as Record<string, string> };
      const cursor = createCursor([{ type: 'click', t: 1, at: [100.3, 50.6] }]);
      cursor.apply(el as unknown as HTMLElement, 0.5);
      expect(el.style.transform).toBe('translate(100.5px, 50.5px)');
      expect(el.style.transformOrigin).toBe('0 0');
      expect(el.dataset.pressed).toBe('false');
      cursor.apply(el as unknown as HTMLElement, 1);
      expect(el.style.transform).toBe('translate(100.5px, 50.5px) scale(0.9)');
      expect(el.dataset.pressed).toBe('true');
    });

    it('exports the arrow as an SVG path', () => {
      expect(ARROW_PATH).toBe('M0 0L0 16L4 12L7 19L10 18L7 11L11 11Z');
    });
  });
});
