import { describe, it, expect } from 'vitest';
import { transition, crossfade } from './transitions.js';

describe('transition', () => {
  it('should return 0 before start', () => {
    expect(transition(0, 10, 20)).toBe(0);
    expect(transition(9, 10, 20)).toBe(0);
  });

  it('should return 1 after end', () => {
    expect(transition(30, 10, 20)).toBe(1);
    expect(transition(50, 10, 20)).toBe(1);
  });

  it('should interpolate linearly by default', () => {
    expect(transition(10, 10, 20)).toBe(0);
    expect(transition(20, 10, 20)).toBe(0.5);
    expect(transition(30, 10, 20)).toBe(1);
  });

  it('should handle zero duration', () => {
    expect(transition(10, 10, 0)).toBe(1);
    expect(transition(11, 10, 0)).toBe(1);
    expect(transition(9, 10, 0)).toBe(0);
  });

  it('should apply easing', () => {
    const easeIn = (t: number) => t * t;
    expect(transition(20, 10, 20, { easing: easeIn })).toBe(0.25); // 0.5 * 0.5
  });
});

describe('crossfade', () => {
  it('should return correct in/out values', () => {
    const result = crossfade(20, 10, 20);
    expect(result.in).toBe(0.5);
    expect(result.out).toBe(0.5);
  });

  it('should return {in: 0, out: 1} before start', () => {
    const result = crossfade(0, 10, 20);
    expect(result.in).toBe(0);
    expect(result.out).toBe(1);
  });

  it('should return {in: 1, out: 0} after end', () => {
    const result = crossfade(50, 10, 20);
    expect(result.in).toBe(1);
    expect(result.out).toBe(0);
  });
});
