import { describe, it, expect } from 'vitest';
import { interpolateColors, parseColor } from './color';
import { HeliosError, HeliosErrorCode } from './errors';

describe('color', () => {
  describe('parseColor', () => {
    it('should parse hex colors', () => {
      expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
      expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
    });

    it('should parse rgb colors', () => {
      expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseColor('rgba(0, 255, 0, 0.5)')).toEqual({ r: 0, g: 255, b: 0, a: 0.5 });
    });

    it('should parse hsl colors', () => {
      expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseColor('hsla(120, 100%, 50%, 0.5)')).toEqual({ r: 0, g: 255, b: 0, a: 0.5 });
    });

    it('should throw error for invalid formats', () => {
      expect(() => parseColor('invalid')).toThrow(HeliosError);
      expect(() => parseColor('#zzzzzz')).toThrow(HeliosError);
    });
  });

  describe('interpolateColors', () => {
    it('should interpolate between two colors', () => {
      const result = interpolateColors(0.5, [0, 1], ['#000000', '#ffffff']);
      expect(result).toBe('rgba(128, 128, 128, 1)');
    });

    it('should handle alpha interpolation', () => {
      const result = interpolateColors(0.5, [0, 1], ['rgba(0,0,0,0)', 'rgba(0,0,0,1)']);
      expect(result).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('should clamp values outside range by default (extrapolate: extend)', () => {
      // By default interpolateColors extends, but RGB values are clamped to 0-255
      const result = interpolateColors(1.5, [0, 1], ['#000000', '#ffffff']);
      // r: 0 + 1.5 * (255 - 0) = 382.5 -> clamped to 255
      expect(result).toBe('rgba(255, 255, 255, 1)');
    });

    it('should clamp correctly when requested', () => {
        const result = interpolateColors(2, [0, 1], ['#000000', '#ffffff'], { extrapolateRight: 'clamp' });
        expect(result).toBe('rgba(255, 255, 255, 1)');
    });

    it('should interpolate across multiple segments', () => {
      // 0 -> Red, 1 -> Green, 2 -> Blue
      const input = [0, 1, 2];
      const output = ['#ff0000', '#00ff00', '#0000ff'];

      expect(interpolateColors(0.5, input, output)).toBe('rgba(128, 128, 0, 1)'); // Mix of Red and Green
      expect(interpolateColors(1.5, input, output)).toBe('rgba(0, 128, 128, 1)'); // Mix of Green and Blue
    });

    it('should respect easing', () => {
        const easeInQuad = (t: number) => t * t;
        // At t=0.5, eased=0.25.
        // 0 + 0.25 * 255 = 63.75 -> 64
        const result = interpolateColors(0.5, [0, 1], ['#000000', '#ffffff'], { easing: easeInQuad });
        expect(result).toBe('rgba(64, 64, 64, 1)');
    });

    it('should validate inputs', () => {
        const t1 = () => interpolateColors(0, [0], ['#000']);
        expect(t1).toThrow();
        try { t1(); } catch (e: any) { expect(e.code).toBe(HeliosErrorCode.INVALID_INPUT_RANGE); }

        const t2 = () => interpolateColors(0, [0, 1], ['#000']);
        expect(t2).toThrow();
        try { t2(); } catch (e: any) { expect(e.code).toBe(HeliosErrorCode.INVALID_INPUT_RANGE); }

        const t3 = () => interpolateColors(0, [1, 0], ['#000', '#fff']);
        expect(t3).toThrow();
        try { t3(); } catch (e: any) { expect(e.code).toBe(HeliosErrorCode.UNSORTED_INPUT_RANGE); }
    });
  });
});
