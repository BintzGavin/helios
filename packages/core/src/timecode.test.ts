import { describe, it, expect } from 'vitest';
import { framesToTimecode, timecodeToFrames, framesToTimestamp } from './timecode';
import { HeliosError, HeliosErrorCode } from './errors';

describe('Timecode Utilities', () => {
  describe('framesToTimecode', () => {
    it('should convert frames to HH:MM:SS:FF format', () => {
      expect(framesToTimecode(0, 30)).toBe('00:00:00:00');
      expect(framesToTimecode(30, 30)).toBe('00:00:01:00');
      expect(framesToTimecode(1800, 30)).toBe('00:01:00:00'); // 1 minute
      expect(framesToTimecode(108000, 30)).toBe('01:00:00:00'); // 1 hour
    });

    it('should handle fractional frames by flooring', () => {
      expect(framesToTimecode(30.5, 30)).toBe('00:00:01:00');
      expect(framesToTimecode(30.9, 30)).toBe('00:00:01:00');
    });

    it('should throw error for invalid FPS', () => {
      expect(() => framesToTimecode(0, 0)).toThrow(HeliosError);
      expect(() => framesToTimecode(0, -30)).toThrow(HeliosError);
    });

    it('should handle different FPS', () => {
      expect(framesToTimecode(60, 60)).toBe('00:00:01:00');
      expect(framesToTimecode(24, 24)).toBe('00:00:01:00');
    });

    it('should handle large frames', () => {
        // 25 hours = 25 * 3600 * 30 = 2,700,000 frames
        expect(framesToTimecode(2700000, 30)).toBe('25:00:00:00');
    });
  });

  describe('timecodeToFrames', () => {
    it('should convert HH:MM:SS:FF to total frames', () => {
      expect(timecodeToFrames('00:00:00:00', 30)).toBe(0);
      expect(timecodeToFrames('00:00:01:00', 30)).toBe(30);
      expect(timecodeToFrames('00:01:00:00', 30)).toBe(1800);
      expect(timecodeToFrames('01:00:00:00', 30)).toBe(108000);
    });

    it('should throw error for invalid format', () => {
        try {
            timecodeToFrames('invalid', 30);
        } catch (e) {
            expect(e).toBeInstanceOf(HeliosError);
            expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_TIMECODE_FORMAT);
        }

        try {
            timecodeToFrames('00:00:00', 30);
        } catch (e) {
            expect(e).toBeInstanceOf(HeliosError);
            expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_TIMECODE_FORMAT);
        }
    });

    it('should throw error for invalid FPS', () => {
        expect(() => timecodeToFrames('00:00:01:00', 0)).toThrow(HeliosError);
    });

    it('should roundtrip correctly with framesToTimecode', () => {
      const fps = 30;
      const frame = 12345;
      const tc = framesToTimecode(frame, fps);
      expect(timecodeToFrames(tc, fps)).toBe(frame);
    });
  });

  describe('framesToTimestamp', () => {
    it('should convert frames to HH:MM:SS.mmm format', () => {
      expect(framesToTimestamp(0, 30)).toBe('00:00:00.000');
      expect(framesToTimestamp(30, 30)).toBe('00:00:01.000');
      expect(framesToTimestamp(15, 30)).toBe('00:00:00.500');
    });

    it('should handle non-integer frames', () => {
        // 30.5 frames at 30fps = 1.01666...s
        expect(framesToTimestamp(30.5, 30)).toMatch(/00:00:01\.01[67]/);
    });

    it('should throw error for invalid FPS', () => {
      expect(() => framesToTimestamp(0, 0)).toThrow(HeliosError);
    });
  });
});
