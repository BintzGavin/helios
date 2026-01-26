import { describe, it, expect } from 'vitest';
import { parseSrt, stringifySrt, CaptionCue } from './captions';
import { HeliosError, HeliosErrorCode } from './errors';

describe('captions', () => {
  describe('parseSrt', () => {
    it('should parse a standard SRT string', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
First caption

2
00:00:05,000 --> 00:00:08,000
Second caption
with two lines`;

      const cues = parseSrt(srt);
      expect(cues).toHaveLength(2);
      expect(cues[0]).toEqual({
        id: '1',
        startTime: 1000,
        endTime: 4000,
        text: 'First caption'
      });
      expect(cues[1]).toEqual({
        id: '2',
        startTime: 5000,
        endTime: 8000,
        text: 'Second caption\nwith two lines'
      });
    });

    it('should handle missing IDs', () => {
      const srt = `00:00:01,000 --> 00:00:04,000
First caption

00:00:05,000 --> 00:00:08,000
Second caption`;

      const cues = parseSrt(srt);
      expect(cues).toHaveLength(2);
      expect(cues[0].id).toBe('1');
      expect(cues[1].id).toBe('2');
    });

    it('should return empty array for empty string', () => {
      expect(parseSrt('')).toEqual([]);
      expect(parseSrt('   ')).toEqual([]);
    });

    it('should throw error for invalid timecode format', () => {
      const srt = `1
00:00:01.000 --> 00:00:04.000
Invalid format`;
      // SRT uses comma, not dot

      try {
        parseSrt(srt);
      } catch (e) {
         expect(e).toBeInstanceOf(HeliosError);
         expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_SRT_FORMAT);
      }
      expect.assertions(2);
    });

    it('should throw error for missing timecode line', () => {
      const srt = `1
First caption`;

      try {
        parseSrt(srt);
      } catch (e) {
         expect(e).toBeInstanceOf(HeliosError);
         expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_SRT_FORMAT);
      }
      expect.assertions(2);
    });
  });

  describe('stringifySrt', () => {
    it('should convert cues to SRT string', () => {
      const cues: CaptionCue[] = [
        {
          id: '1',
          startTime: 1000,
          endTime: 4000,
          text: 'First caption'
        },
        {
          id: '2',
          startTime: 5000,
          endTime: 8000,
          text: 'Second caption\nwith two lines'
        }
      ];

      const expected = `1
00:00:01,000 --> 00:00:04,000
First caption

2
00:00:05,000 --> 00:00:08,000
Second caption
with two lines`;

      expect(stringifySrt(cues)).toBe(expected);
    });
  });

  describe('Round trip', () => {
     it('should preserve data through parse -> stringify', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
First caption

2
00:00:05,000 --> 00:00:08,000
Second caption
with two lines`;

      const cues = parseSrt(srt);
      const output = stringifySrt(cues);
      expect(output).toBe(srt);
     });
  });
});
