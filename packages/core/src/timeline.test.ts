import { describe, it, expect, vi } from 'vitest';
import { Helios } from './index.js';
import { HeliosTimeline, HeliosClip } from './types.js';

describe('Helios Timeline Active Clips', () => {
  const createTimeline = (): HeliosTimeline => ({
    tracks: [
      {
        id: 'track-1',
        clips: [
          { id: 'c1', source: 'src1', start: 0, duration: 2 },
          { id: 'c2', source: 'src2', start: 3, duration: 2 }
        ]
      },
      {
        id: 'track-2',
        clips: [
          { id: 'c3', source: 'src3', start: 1, duration: 3 }
        ]
      }
    ]
  });

  it('should initialize with empty activeClips if no timeline', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    expect(helios.activeClips.value).toEqual([]);
    expect(helios.getState().activeClips).toEqual([]);
  });

  it('should initialize with activeClips based on timeline and initial frame', () => {
    const timeline = createTimeline();
    // At t=0, c1 is active (0-2s)
    const helios = new Helios({ duration: 10, fps: 30, timeline });

    expect(helios.activeClips.value).toHaveLength(1);
    expect(helios.activeClips.value[0].id).toBe('c1');
  });

  it('should update activeClips when seeking', () => {
    const timeline = createTimeline();
    const helios = new Helios({ duration: 10, fps: 30, timeline });

    // t=1.5s: c1 (0-2s) and c3 (1-4s) should be active
    helios.seek(45); // 1.5 * 30 = 45
    expect(helios.activeClips.value).toHaveLength(2);
    const ids = helios.activeClips.value.map(c => c.id).sort();
    expect(ids).toEqual(['c1', 'c3']);

    // t=2.5s: only c3 (1-4s) should be active. c1 ended at 2s.
    helios.seek(75); // 2.5 * 30 = 75
    expect(helios.activeClips.value).toHaveLength(1);
    expect(helios.activeClips.value[0].id).toBe('c3');

    // t=3.5s: c2 (3-5s) and c3 (1-4s) should be active
    helios.seek(105); // 3.5 * 30 = 105
    expect(helios.activeClips.value).toHaveLength(2);
    const ids2 = helios.activeClips.value.map(c => c.id).sort();
    expect(ids2).toEqual(['c2', 'c3']);
  });

  it('should handle gaps where no clips are active', () => {
    const timeline = createTimeline();
    const helios = new Helios({ duration: 10, fps: 30, timeline });

    // t=5.5s: all clips ended
    helios.seek(165); // 5.5 * 30 = 165
    expect(helios.activeClips.value).toEqual([]);
  });

  it('should update activeClips when setting timeline via setTimeline', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    expect(helios.activeClips.value).toEqual([]);

    const timeline = createTimeline();
    helios.setTimeline(timeline);

    // Default t=0, c1 should be active
    expect(helios.activeClips.value).toHaveLength(1);
    expect(helios.activeClips.value[0].id).toBe('c1');
  });

  it('should handle exact start time (inclusive)', () => {
    const timeline = {
      tracks: [{
        id: 't1',
        clips: [{ id: 'c1', source: 's', start: 1, duration: 1 }]
      }]
    };
    const helios = new Helios({ duration: 10, fps: 30, timeline });

    helios.seek(30); // 1.0s
    expect(helios.activeClips.value).toHaveLength(1);
    expect(helios.activeClips.value[0].id).toBe('c1');
  });

  it('should handle exact end time (exclusive)', () => {
    const timeline = {
      tracks: [{
        id: 't1',
        clips: [{ id: 'c1', source: 's', start: 1, duration: 1 }]
      }]
    };
    const helios = new Helios({ duration: 10, fps: 30, timeline });

    helios.seek(60); // 2.0s
    expect(helios.activeClips.value).toEqual([]);
  });

  it('should include clips from multiple tracks', () => {
    const timeline: HeliosTimeline = {
      tracks: [
        { id: 't1', clips: [{ id: 'c1', source: 's', start: 0, duration: 5 }] },
        { id: 't2', clips: [{ id: 'c2', source: 's', start: 0, duration: 5 }] },
        { id: 't3', clips: [{ id: 'c3', source: 's', start: 0, duration: 5 }] }
      ]
    };
    const helios = new Helios({ duration: 10, fps: 30, timeline });

    expect(helios.activeClips.value).toHaveLength(3);
  });
});
