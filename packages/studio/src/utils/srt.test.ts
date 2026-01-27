import { describe, it, expect } from 'vitest';
import { stringifySrt } from './srt';
import { CaptionCue } from '@helios-project/core';

describe('stringifySrt', () => {
  it('should stringify a single cue correctly', () => {
    const cues: CaptionCue[] = [
      {
        id: '1',
        startTime: 0,
        endTime: 2000,
        text: 'Hello World'
      }
    ];

    const expected = `1
00:00:00,000 --> 00:00:02,000
Hello World`;

    expect(stringifySrt(cues)).toBe(expected);
  });

  it('should stringify multiple cues correctly', () => {
    const cues: CaptionCue[] = [
      {
        id: '1',
        startTime: 1000,
        endTime: 2500,
        text: 'Line 1'
      },
      {
        id: '2',
        startTime: 3000,
        endTime: 4000,
        text: 'Line 2\nmultiline'
      }
    ];

    const expected = `1
00:00:01,000 --> 00:00:02,500
Line 1

2
00:00:03,000 --> 00:00:04,000
Line 2
multiline`;

    expect(stringifySrt(cues)).toBe(expected);
  });

  it('should handle missing IDs by using index + 1', () => {
    const cues: CaptionCue[] = [
      {
        id: '',
        startTime: 0,
        endTime: 1000,
        text: 'Test'
      }
    ];

    const expected = `1
00:00:00,000 --> 00:00:01,000
Test`;

    expect(stringifySrt(cues)).toBe(expected);
  });

  it('should handle large time values', () => {
    const cues: CaptionCue[] = [
      {
        id: '1',
        startTime: 3661000, // 1h 1m 1s
        endTime: 3662000,
        text: 'Hour mark'
      }
    ];

    const expected = `1
01:01:01,000 --> 01:01:02,000
Hour mark`;

    expect(stringifySrt(cues)).toBe(expected);
  });
});
