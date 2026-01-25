import { describe, it, expect } from 'vitest';
import { interpolate, spring } from './animation';

describe('interpolate', () => {
  it('interpolates within range', () => {
    expect(interpolate(0.5, [0, 1], [0, 100])).toBe(50);
    expect(interpolate(0, [0, 1], [0, 100])).toBe(0);
    expect(interpolate(1, [0, 1], [0, 100])).toBe(100);
  });

  it('handles multi-segment ranges', () => {
    const input = [0, 10, 20];
    const output = [0, 100, 0];
    expect(interpolate(5, input, output)).toBe(50);
    expect(interpolate(10, input, output)).toBe(100);
    expect(interpolate(15, input, output)).toBe(50);
    expect(interpolate(20, input, output)).toBe(0);
  });

  it('defaults to extend for extrapolation', () => {
    expect(interpolate(2, [0, 1], [0, 100])).toBe(200);
    expect(interpolate(-1, [0, 1], [0, 100])).toBe(-100);
  });

  it('supports clamp extrapolation', () => {
    expect(interpolate(2, [0, 1], [0, 100], { extrapolateRight: 'clamp' })).toBe(100);
    expect(interpolate(-1, [0, 1], [0, 100], { extrapolateLeft: 'clamp' })).toBe(0);
  });

  it('supports identity extrapolation', () => {
    expect(interpolate(2, [0, 1], [0, 100], { extrapolateRight: 'identity' })).toBe(2);
    expect(interpolate(-1, [0, 1], [0, 100], { extrapolateLeft: 'identity' })).toBe(-1);
  });

  it('applies easing within range', () => {
    const easeQuad = (t: number) => t * t;
    expect(interpolate(0.5, [0, 1], [0, 100], { easing: easeQuad })).toBe(25);
  });

  it('does not apply easing to extended extrapolation', () => {
    // Spec decision: Linear extension ignores easing
    const easeQuad = (t: number) => t * t;
    // Linear extension slope is 100.
    // 0 -> 0, 1 -> 100. Slope 100.
    // at 1.5, should be 150.
    expect(interpolate(1.5, [0, 1], [0, 100], { easing: easeQuad })).toBe(150);
  });

  it('validates input range length matches output range length', () => {
    expect(() => interpolate(0, [0, 1], [0])).toThrow(/same length/);
  });

  it('validates input range has at least 2 elements', () => {
    expect(() => interpolate(0, [0], [0])).toThrow(/at least 2 elements/);
  });

  it('validates strictly ascending input range', () => {
    expect(() => interpolate(0, [1, 0], [0, 100])).toThrow(/strictly monotonically increasing/);
    expect(() => interpolate(0, [0, 0], [0, 100])).toThrow(/strictly monotonically increasing/);
  });
});

describe('spring', () => {
  it('starts at "from" value at frame 0', () => {
    expect(spring({ frame: 0, fps: 30, from: 0, to: 100 })).toBe(0);
  });

  it('approaches "to" value at large frame', () => {
    const val = spring({ frame: 300, fps: 30, from: 0, to: 100 });
    expect(Math.abs(val - 100)).toBeLessThan(0.1);
  });

  it('overshoots when underdamped', () => {
    // Underdamped config: low damping
    const config = { damping: 5, stiffness: 100, mass: 1 };
    // We expect some value > 100
    // At some point it should be > 100
    let overshot = false;
    for (let f = 0; f < 60; f++) {
      if (spring({ frame: f, fps: 30, from: 0, to: 100, config }) > 100) {
        overshot = true;
        break;
      }
    }
    expect(overshot).toBe(true);
  });

  it('clamps overshoot when requested', () => {
    const config = { damping: 5, stiffness: 100, mass: 1, overshootClamping: true };
    for (let f = 0; f < 60; f++) {
      const val = spring({ frame: f, fps: 30, from: 0, to: 100, config });
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it('supports custom from and to values', () => {
    // 50 -> 150
    expect(spring({ frame: 0, fps: 30, from: 50, to: 150 })).toBe(50);
    const val = spring({ frame: 300, fps: 30, from: 50, to: 150 });
    expect(Math.abs(val - 150)).toBeLessThan(0.1);
  });

  it('handles overdamped case', () => {
    // Overdamped: high damping
    const config = { damping: 50, stiffness: 100, mass: 1 };
    // Should not overshoot
    for (let f = 0; f < 60; f++) {
      const val = spring({ frame: f, fps: 30, from: 0, to: 100, config });
      expect(val).toBeLessThanOrEqual(100);
    }
    // Should eventually reach target
    const final = spring({ frame: 300, fps: 30, from: 0, to: 100, config });
    expect(Math.abs(final - 100)).toBeLessThan(0.1);
  });

  it('handles critically damped case', () => {
    // Critically damped: damping = 2 * sqrt(k*m) = 2 * sqrt(100*1) = 20
    const config = { damping: 20, stiffness: 100, mass: 1 };
    // Should not overshoot
    for (let f = 0; f < 60; f++) {
      const val = spring({ frame: f, fps: 30, from: 0, to: 100, config });
      expect(val).toBeLessThanOrEqual(100.001); // floating point tolerance
    }
    // Should eventually reach target
    const final = spring({ frame: 300, fps: 30, from: 0, to: 100, config });
    expect(Math.abs(final - 100)).toBeLessThan(0.1);
  });

  it('throws on invalid physics config', () => {
    expect(() => spring({ frame: 10, fps: 30, config: { mass: 0 } })).toThrow(/mass/);
    expect(() => spring({ frame: 10, fps: 30, config: { stiffness: 0 } })).toThrow(/stiffness/);
  });
});
