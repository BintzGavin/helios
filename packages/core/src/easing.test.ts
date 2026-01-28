import { describe, it, expect } from 'vitest';
import { Easing } from './easing.js';

describe('Easing', () => {
  it('Easing.linear', () => {
    expect(Easing.linear(0)).toBe(0);
    expect(Easing.linear(0.5)).toBe(0.5);
    expect(Easing.linear(1)).toBe(1);
  });

  it('Easing.step', () => {
    const step4 = Easing.step(4);
    expect(step4(0)).toBe(0);
    expect(step4(0.1)).toBe(0);
    expect(step4(0.25)).toBe(0.25);
    expect(step4(0.4)).toBe(0.25);
    expect(step4(0.5)).toBe(0.5);
    expect(step4(0.99)).toBe(0.75);
    expect(step4(1)).toBe(1);
  });

  const categories = [
    'quad', 'cubic', 'quart', 'quint',
    'sine', 'expo', 'circ',
    'back', 'elastic', 'bounce'
  ] as const;

  categories.forEach((cat) => {
    describe(`Easing.${cat}`, () => {
      const { in: easeIn, out: easeOut, inOut: easeInOut } = Easing[cat];

      it('starts at 0 and ends at 1', () => {
        expect(easeIn(0)).toBeCloseTo(0);
        expect(easeIn(1)).toBeCloseTo(1);
        expect(easeOut(0)).toBeCloseTo(0);
        expect(easeOut(1)).toBeCloseTo(1);
        expect(easeInOut(0)).toBeCloseTo(0);
        expect(easeInOut(1)).toBeCloseTo(1);
      });

      it('easeIn is slower at start than end (convex)', () => {
        if (cat === 'elastic' || cat === 'back' || cat === 'bounce') return; // physical models are complex
        expect(easeIn(0.25)).toBeLessThan(0.25);
        expect(easeIn(0.75)).toBeLessThan(0.75); // Generally true for power curves
      });

      it('easeOut is faster at start than end (concave)', () => {
        if (cat === 'elastic' || cat === 'back' || cat === 'bounce') return;
        expect(easeOut(0.25)).toBeGreaterThan(0.25);
        expect(easeOut(0.75)).toBeGreaterThan(0.75);
      });

      it('easeInOut is symmetricish', () => {
        if (cat === 'elastic' || cat === 'back' || cat === 'bounce') return;
        expect(easeInOut(0.5)).toBeCloseTo(0.5);
      });
    });
  });

  describe('Easing.bezier', () => {
    it('approximates linear when handles are diagonal', () => {
      const linear = Easing.bezier(0, 0, 1, 1);
      expect(linear(0)).toBe(0);
      expect(linear(0.5)).toBeCloseTo(0.5);
      expect(linear(1)).toBe(1);
    });

    it('approximates ease-in', () => {
      const easeIn = Easing.bezier(0.42, 0, 1, 1);
      expect(easeIn(0.25)).toBeLessThan(0.25);
    });

    it('approximates ease-out', () => {
      const easeOut = Easing.bezier(0, 0, 0.58, 1);
      expect(easeOut(0.25)).toBeGreaterThan(0.25);
    });
  });
});
