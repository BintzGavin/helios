import { describe, it, expect } from 'vitest';
import { sequence } from './sequencing';

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
