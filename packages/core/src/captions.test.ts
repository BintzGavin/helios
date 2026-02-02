import { describe, it, expect } from 'vitest';
import { parseSrt, parseWebVTT, parseCaptions, stringifySrt, findActiveCues, CaptionCue } from './captions.js';
import { HeliosError, HeliosErrorCode } from './errors.js';

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

  describe('parseWebVTT', () => {
    it('should parse a valid WebVTT string', () => {
      const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
First caption

2
00:00:05.000 --> 00:00:08.000
Second caption
with two lines`;

      const cues = parseWebVTT(vtt);
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
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
First caption

00:00:05.000 --> 00:00:08.000
Second caption`;

      const cues = parseWebVTT(vtt);
      expect(cues).toHaveLength(2);
      expect(cues[0].id).toBe('1');
      expect(cues[1].id).toBe('2');
    });

    it('should ignore NOTE blocks', () => {
      const vtt = `WEBVTT

NOTE This is a comment

00:00:01.000 --> 00:00:04.000
First caption`;

      const cues = parseWebVTT(vtt);
      expect(cues).toHaveLength(1);
      expect(cues[0].text).toBe('First caption');
    });

    it('should handle timestamps without hours', () => {
      const vtt = `WEBVTT

00:01.000 --> 00:04.000
First caption`;

      const cues = parseWebVTT(vtt);
      expect(cues).toHaveLength(1);
      expect(cues[0].startTime).toBe(1000);
      expect(cues[0].endTime).toBe(4000);
    });

    it('should throw error for missing WEBVTT header', () => {
      const vtt = `1
00:00:01.000 --> 00:00:04.000
First caption`;

      try {
        parseWebVTT(vtt);
      } catch (e) {
        expect(e).toBeInstanceOf(HeliosError);
        expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_WEBVTT_FORMAT);
      }
      expect.assertions(2);
    });
  });

  describe('parseCaptions', () => {
    it('should detect and parse WebVTT', () => {
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
First caption`;
      const cues = parseCaptions(vtt);
      expect(cues).toHaveLength(1);
      expect(cues[0].text).toBe('First caption');
    });

    it('should detect and parse SRT', () => {
      const srt = `1
00:00:01,000 --> 00:00:04,000
First caption`;
      const cues = parseCaptions(srt);
      expect(cues).toHaveLength(1);
      expect(cues[0].text).toBe('First caption');
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

  describe('findActiveCues', () => {
    const cues: CaptionCue[] = [
      { id: '1', startTime: 1000, endTime: 2000, text: 'First' },
      { id: '2', startTime: 2500, endTime: 3500, text: 'Second' },
      { id: '3', startTime: 3000, endTime: 4000, text: 'Third (overlap)' }
    ];

    it('should return empty array if no cues match', () => {
      expect(findActiveCues(cues, 0)).toEqual([]);
      expect(findActiveCues(cues, 500)).toEqual([]);
      expect(findActiveCues(cues, 2200)).toEqual([]);
      expect(findActiveCues(cues, 5000)).toEqual([]);
    });

    it('should return single active cue', () => {
      const active = findActiveCues(cues, 1500);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('1');
    });

    it('should include cues at boundary times', () => {
      // Start time inclusive
      const start = findActiveCues(cues, 1000);
      expect(start).toHaveLength(1);
      expect(start[0].id).toBe('1');

      // End time inclusive
      const end = findActiveCues(cues, 2000);
      expect(end).toHaveLength(1);
      expect(end[0].id).toBe('1');
    });

    it('should return multiple cues if overlapping', () => {
      const overlap = findActiveCues(cues, 3200);
      expect(overlap).toHaveLength(2);
      expect(overlap.map(c => c.id)).toEqual(['2', '3']);
    });
  });
});
