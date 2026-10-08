import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBeatClock, loadBeats, type BeatsData } from '../components/beatClock.js';

// 64 beats whose tempo drifts from 120 to 132 BPM, each nudged a few ms the way beats snapped
// to real onsets are.
function driftingBeats(count = 64): number[] {
  const beats: number[] = [];
  let t = 0.5;
  for (let i = 0; i < count; i++) {
    beats.push(Math.round((t + 0.006 * Math.sin(i * 1.7)) * 10000) / 10000);
    t += 60 / (120 + (12 * i) / (count - 1));
  }
  return beats;
}

function song(overrides: Partial<BeatsData> = {}): BeatsData {
  const beats = driftingBeats();
  return {
    version: 1,
    source: 'song.mp3',
    duration: 32,
    bpm: 126,
    beatsPerBar: 4,
    beats,
    // Two pickup beats: bar 0 starts on beat 2.
    downbeats: beats.filter((_, i) => i >= 2 && (i - 2) % 4 === 0),
    sections: [{ t0: 0, t1: 8, energy: 0.3 }, { t0: 8, t1: 20, energy: 0.8 }, { t0: 22, t1: 30, energy: 0.5 }],
    hits: [{ t: 12.5, score: 0.9 }, { t: 4.25, score: 0.6 }, { t: 20, score: 0.7 }],
    onsets: { kick: [0.5, 1.5, 2.5], snare: [1, 2], hat: [] },
    risers: [],
    envelope: { fps: 10, level: [0, 1, 0.5, 0.25], low: [1, 0] },
    ...overrides,
  };
}

const mid = (a: number, b: number) => (a + b) / 2;

describe('beat-clock', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('beat', () => {
    const data = song();
    const { beats } = data;
    const clock = createBeatClock(data);

    it('finds every beat of a drifting list, with that beat as its length', () => {
      // A fixed grid at the opening tempo is beats off by the end.
      const fixed = (beats[63] - beats[0]) / (60 / 120);
      expect(63 - fixed).toBeGreaterThan(2);

      for (let i = 0; i < beats.length - 1; i++) {
        expect(clock.beat(beats[i])).toEqual({ index: i, phase: 0, length: beats[i + 1] - beats[i] });
        const halfway = clock.beat(mid(beats[i], beats[i + 1]));
        expect(halfway.index).toBe(i);
        expect(halfway.phase).toBeCloseTo(0.5, 9);
      }
      expect(clock.beat(beats[10] - 1e-6).index).toBe(9);
    });

    it('counts the pickup before the first beat as -1, its phase rising to the beat', () => {
      // No tempo curve: the pickup lasts as long as the first eight beats' average.
      const average = (beats[8] - beats[0]) / 8;
      expect(clock.beat(beats[0] - average / 2)).toEqual({ index: -1, phase: expect.closeTo(0.5, 9), length: average });
      expect(clock.beat(-5)).toEqual({ index: -1, phase: 0, length: average });
    });

    it('keeps the grid going past the last beat at the closing tempo', () => {
      const last = beats[beats.length - 1];
      const tail = (last - beats[beats.length - 9]) / 8;
      for (let k = 1; k <= 40; k++) {
        expect(clock.beat(last + k * tail)).toEqual({ index: 63 + k, phase: 0, length: tail });
        expect(clock.beat(last + (k + 0.25) * tail).phase).toBeCloseTo(0.25, 9);
      }
      expect(clock.beat(last).index).toBe(63);
    });

    it('takes the closing tempo from the tempo curve when there is one', () => {
      const withTempo = createBeatClock(song({ tempo: [{ t: 0, bpm: 120 }, { t: 25, bpm: 132 }] }));
      const last = beats[beats.length - 1];
      expect(withTempo.beat(last + 2.5 * (60 / 132))).toEqual({ index: 65, phase: expect.closeTo(0.5, 9), length: 60 / 132 });
      expect(withTempo.beat(beats[0] - 0.25).length).toBe(0.5);
    });

    it('writes into the object it is given', () => {
      const out = { index: 0, phase: 0, length: 0 };
      expect(clock.beat(beats[5], out)).toBe(out);
      expect(out.index).toBe(5);
    });
  });

  describe('bar', () => {
    const data = song();
    const { beats } = data;
    const clock = createBeatClock(data);

    it('counts bars from the first downbeat, with the beat in the bar', () => {
      expect(clock.bar(beats[2])).toEqual({ index: 0, phase: 0, beat: 0 });
      expect(clock.bar(beats[5])).toEqual({ index: 0, phase: 0.75, beat: 3 });
      expect(clock.bar(beats[6])).toEqual({ index: 1, phase: 0, beat: 0 });
      expect(clock.bar(beats[61])).toEqual({ index: 14, phase: 0.75, beat: 3 });
    });

    it('moves the phase evenly per beat, whatever each beat lasts', () => {
      const at = clock.bar(mid(beats[4], beats[5]));
      expect(at.index).toBe(0);
      expect(at.beat).toBe(2);
      expect(at.phase).toBeCloseTo(2.5 / 4, 9);

      let previous = -1;
      for (let t = beats[2]; t < beats[6]; t += 0.01) {
        const { phase } = clock.bar(t);
        expect(phase).toBeGreaterThan(previous);
        previous = phase;
      }
      expect(previous).toBeGreaterThan(0.98);
    });

    it('counts the pickup beats as the end of bar -1', () => {
      expect(clock.bar(beats[0])).toEqual({ index: -1, phase: 0.5, beat: 2 });
      expect(clock.bar(beats[1])).toEqual({ index: -1, phase: 0.75, beat: 3 });
    });

    it('keeps counting bars of beatsPerBar beats past the last downbeat', () => {
      const last = beats[beats.length - 1];
      const tail = (last - beats[beats.length - 9]) / 8;
      // Beat 62 is the last downbeat (bar 15); beat 66 starts bar 16.
      expect(clock.bar(last + 3 * tail)).toEqual({ index: 16, phase: 0, beat: 0 });
      expect(clock.bar(last + 4.5 * tail)).toEqual({ index: 16, phase: expect.closeTo(1.5 / 4, 9), beat: 1 });
    });

    it('makes bars from every beatsPerBar beats when there are no downbeats', () => {
      const plain = createBeatClock({ beats, beatsPerBar: 3 });
      expect(plain.downbeats).toEqual(beats.filter((_, i) => i % 3 === 0));
      expect(plain.bar(beats[7])).toEqual({ index: 2, phase: expect.closeTo(1 / 3, 9), beat: 1 });
    });
  });

  describe('events', () => {
    const clock = createBeatClock(song());

    it('gives seconds since the last event and until the next', () => {
      expect(clock.since(1.75, 'kick')).toBeCloseTo(0.25, 12);
      expect(clock.next(1.75, 'kick')).toBeCloseTo(0.75, 12);
      expect(clock.since(1.5, 'kick')).toBe(0);
      expect(clock.next(1.5, 'kick')).toBe(1);
      expect(clock.since(0.4, 'kick')).toBe(Infinity);
      expect(clock.next(2.5, 'kick')).toBe(Infinity);
      expect(clock.since(13, 'hit')).toBeCloseTo(0.5, 12);
      expect(clock.next(3, [1, 5, 9])).toBe(2);
    });

    it('pulses 1 on the event and halves every half-life', () => {
      expect(clock.pulse(1.5, 'kick')).toBe(1);
      expect(clock.pulse(1.6, 'kick')).toBeCloseTo(0.5, 12);
      expect(clock.pulse(1.7, 'kick')).toBeCloseTo(0.25, 12);
      expect(clock.pulse(1.75, 'kick', 0.25)).toBeCloseTo(0.5, 12);
      expect(clock.pulse(0.4, 'kick')).toBe(0);
      expect(clock.pulse(2, 'snare', 0)).toBe(1);
      expect(clock.pulse(2.01, 'snare', 0)).toBe(0);
      // Each event starts the pulse over.
      expect(clock.pulse(2.5, 'kick')).toBe(1);
      expect(clock.pulse(clock.beats[3])).toBe(1);
    });

    it('explains an unknown event name', () => {
      expect(() => clock.since(1, 'clap' as never)).toThrow('Unknown events "clap"');
    });

    it('gives each hit to exactly one frame', () => {
      const fps = 30;
      const seen: number[] = [];
      for (let frame = 0; frame <= 30 * fps; frame++) {
        const t = frame / fps;
        seen.push(...clock.hitsBetween(t - 1 / fps, t).map((hit) => hit.t));
      }
      expect(seen).toEqual([4.25, 12.5, 20]);
      expect(clock.hitsBetween(4, 20)).toEqual([{ t: 4.25, score: 0.6 }, { t: 12.5, score: 0.9 }, { t: 20, score: 0.7 }]);
      expect(clock.hitsBetween(4.25, 12)).toEqual([]);
      // No hits: the same empty list every time, nothing allocated.
      expect(clock.hitsBetween(1, 2)).toBe(clock.hitsBetween(5, 6));
      expect(clock.hits.map((hit) => hit.t)).toEqual([4.25, 12.5, 20]);
    });
  });

  describe('level', () => {
    const clock = createBeatClock(song());

    it('interpolates the envelope linearly between frames', () => {
      expect(clock.level(0)).toBe(0);
      expect(clock.level(0.1)).toBe(1);
      expect(clock.level(0.05)).toBeCloseTo(0.5, 12);
      expect(clock.level(0.15)).toBeCloseTo(0.75, 12);
      expect(clock.level(0.275)).toBeCloseTo(0.3125, 12);
      expect(clock.level(0.025, 'low')).toBeCloseTo(0.75, 12);
    });

    it('holds the ends and reads missing bands as 0', () => {
      expect(clock.level(-1)).toBe(0);
      expect(clock.level(99)).toBe(0.25);
      expect(clock.level(99, 'low')).toBe(0);
      expect(clock.level(0.1, 'high')).toBe(0);
      expect(createBeatClock({ beats: [1, 2] }).level(1)).toBe(0);
    });
  });

  describe('section', () => {
    const clock = createBeatClock(song());

    it('finds the section with its index, and null in gaps and outside', () => {
      expect(clock.section(0)).toEqual({ index: 0, t0: 0, t1: 8, energy: 0.3 });
      expect(clock.section(8)).toEqual({ index: 1, t0: 8, t1: 20, energy: 0.8 });
      expect(clock.section(19.99)?.index).toBe(1);
      expect(clock.section(21)).toBeNull();
      expect(clock.section(29)?.index).toBe(2);
      expect(clock.section(30)).toBeNull();
      expect(clock.section(-1)).toBeNull();
      expect(clock.section(3)).toBe(clock.section(4));
    });
  });

  it('answers the same at any time, in any order', () => {
    const clock = createBeatClock(song());
    const snapshot = (t: number) => JSON.stringify([
      clock.beat(t), clock.bar(t), clock.since(t, 'kick'), clock.next(t, 'downbeat'),
      clock.pulse(t, 'beat'), clock.level(t), clock.hitsBetween(t - 1 / 30, t), clock.section(t),
    ]);
    const times = Array.from({ length: 400 }, (_, i) => i * 0.0833 - 1);
    const inOrder = times.map(snapshot);
    // A fixed shuffle: every 7th time, wrapping.
    const shuffled = times.map((_, i) => (i * 7) % times.length);
    for (const i of shuffled) expect(snapshot(times[i])).toBe(inOrder[i]);
    for (const i of shuffled.reverse()) expect(snapshot(times[i])).toBe(inOrder[i]);
  });

  it('sorts its lists and keeps the data', () => {
    const data = song({ beats: [3, 1, 2, 4], downbeats: [3, 1], onsets: { kick: [2, 1] } });
    const clock = createBeatClock(data);
    expect(clock.beats).toEqual([1, 2, 3, 4]);
    expect(clock.downbeats).toEqual([1, 3]);
    expect(clock.kicks).toEqual([1, 2]);
    expect(clock.data).toBe(data);
    expect(clock.duration).toBe(32);
    expect(clock.beatsPerBar).toBe(4);
    expect(data.beats).toEqual([3, 1, 2, 4]);
  });

  it('explains data without beats', () => {
    expect(() => createBeatClock({} as BeatsData)).toThrow('no "beats" list');
  });

  it('loads the JSON helios analyze writes', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(song()), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const clock = await loadBeats('song.beats.json');
    expect(fetch).toHaveBeenCalledWith('song.beats.json');
    expect(clock.beats).toHaveLength(64);
  });

  it('says how to make the file when it is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not found', { status: 404 })));
    await expect(loadBeats('song.beats.json')).rejects.toThrow('Could not load beats from song.beats.json (HTTP 404). Run "helios analyze <audio>"');
  });
});
