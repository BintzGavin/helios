import { describe, it, expect } from 'vitest';
import { sequence, series } from './sequencing.js';

describe('sequence', () => {
  it('handles finite duration correctly', () => {
    const from = 10;
    const duration = 5; // Frames: 10, 11, 12, 13, 14

    // Before
    let res = sequence({ frame: 0, from, durationInFrames: duration });
    expect(res.isActive).toBe(false);
    expect(res.progress).toBe(0);
    expect(res.localFrame).toBe(-10);
    expect(res.relativeFrame).toBe(-10);

    // Start
    res = sequence({ frame: 10, from, durationInFrames: duration });
    expect(res.isActive).toBe(true);
    expect(res.progress).toBe(0);
    expect(res.localFrame).toBe(0);

    // Middle
    res = sequence({ frame: 12, from, durationInFrames: duration });
    expect(res.isActive).toBe(true);
    expect(res.progress).toBe(2 / 5);
    expect(res.localFrame).toBe(2);

    // End of duration (exclusive boundary)
    // Frame 15 is the first frame *after* the sequence
    res = sequence({ frame: 15, from, durationInFrames: duration });
    expect(res.isActive).toBe(false);
    expect(res.progress).toBe(1);
    expect(res.localFrame).toBe(5);

    // After
    res = sequence({ frame: 20, from, durationInFrames: duration });
    expect(res.isActive).toBe(false);
    expect(res.progress).toBe(1);
    expect(res.localFrame).toBe(10);
  });

  it('handles infinite duration', () => {
    const from = 10;

    // Before
    let res = sequence({ frame: 5, from });
    expect(res.isActive).toBe(false);
    expect(res.progress).toBe(0);
    expect(res.localFrame).toBe(-5);

    // Start
    res = sequence({ frame: 10, from });
    expect(res.isActive).toBe(true);
    expect(res.progress).toBe(0);
    expect(res.localFrame).toBe(0);

    // Way after
    res = sequence({ frame: 1000, from });
    expect(res.isActive).toBe(true);
    expect(res.progress).toBe(0);
    expect(res.localFrame).toBe(990);
  });

  it('handles zero duration', () => {
    // Duration 0 means it never activates (takes up 0 frames)
    const res = sequence({ frame: 10, from: 10, durationInFrames: 0 });
    expect(res.isActive).toBe(false);
    expect(res.progress).toBe(1); // Treated as "completed" immediately
    expect(res.localFrame).toBe(0);
  });
});

describe('series', () => {
  it('calculates sequential start times', () => {
    const items = [
      { id: 'a', durationInFrames: 10 },
      { id: 'b', durationInFrames: 20 },
      { id: 'c', durationInFrames: 30 },
    ];
    const result = series(items);

    expect(result).toHaveLength(3);
    expect(result[0].from).toBe(0);
    expect(result[1].from).toBe(10);
    expect(result[2].from).toBe(30); // 10 + 20
  });

  it('handles offsets', () => {
    const items = [
      { id: 'a', durationInFrames: 10 },
      { id: 'b', durationInFrames: 20, offset: -5 }, // Starts at 10 - 5 = 5. Ends at 5 + 20 = 25.
      { id: 'c', durationInFrames: 10 }, // Starts at 25.
    ];
    const result = series(items);

    expect(result[0].from).toBe(0);
    expect(result[1].from).toBe(5);
    expect(result[2].from).toBe(25);
  });

  it('handles positive offsets (gaps)', () => {
    const items = [
      { id: 'a', durationInFrames: 10 },
      { id: 'b', durationInFrames: 10, offset: 5 }, // Starts at 10 + 5 = 15. Ends at 15 + 10 = 25.
    ];
    const result = series(items);

    expect(result[0].from).toBe(0);
    expect(result[1].from).toBe(15);
  });

  it('respects startFrame', () => {
    const items = [
      { durationInFrames: 10 },
      { durationInFrames: 10 },
    ];
    const result = series(items, 100);

    expect(result[0].from).toBe(100);
    expect(result[1].from).toBe(110);
  });

  it('passes through extra properties', () => {
    const items = [
      { durationInFrames: 10, name: 'Intro', extra: { foo: 'bar' } },
    ];
    const result = series(items);

    expect(result[0].name).toBe('Intro');
    expect(result[0].extra).toEqual({ foo: 'bar' });
  });

  it('handles empty array', () => {
    const result = series([]);
    expect(result).toHaveLength(0);
  });

  it('handles zero duration items', () => {
    const items = [
      { durationInFrames: 0 },
      { durationInFrames: 10 },
    ];
    const result = series(items);

    expect(result[0].from).toBe(0);
    expect(result[1].from).toBe(0); // 0 + 0 = 0
  });
});
