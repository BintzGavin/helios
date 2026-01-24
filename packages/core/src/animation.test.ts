import { describe, it, expect } from 'vitest';
import { interpolate } from './animation';

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
