import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyzeAudioFile, analyzeSamples, formatBeatMap, type BeatMap } from '../beatmap.js';
import { RealFft } from '../fft.js';
import { FeatureExtractor } from '../features.js';
import { drumOnsets } from '../onsets.js';
import { tempoCurve } from '../beats.js';
import {
  NOTE, SR, Track, chord, crash, drumLoop, dropSong, hat, kick, rampBeats, riser, snare, steadyBeats, typingSong, writeWav,
  type Loop, type Song,
} from './synth.js';

const C = [NOTE.C4, NOTE.E4, NOTE.G4];
const Am = [NOTE.A3, NOTE.C4, NOTE.E4];
const F = [NOTE.F3, NOTE.A3, NOTE.C4];
const G = [NOTE.G3, NOTE.B3, NOTE.D4];
const PROGRESSION = [C, Am, F, G];

/** For each true time, the distance to the nearest detected one; the largest of those. */
function worstMiss(got: number[], truth: number[]): number {
  let worst = 0;
  for (const t of truth) {
    let best = Infinity;
    for (const g of got) best = Math.min(best, Math.abs(g - t));
    worst = Math.max(worst, best);
  }
  return worst;
}

let dir: string;
const file = (name: string) => path.join(dir, name);
function save(name: string, loop: Loop | Track): string {
  const track = loop instanceof Track ? loop : loop.track;
  writeWav(file(name), track.normalize().samples);
  return file(name);
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-analyze-'));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('RealFft', () => {
  it('matches a direct DFT', () => {
    const n = 64;
    const x = Array.from({ length: n }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1) + (i % 5) * 0.1);
    const re = new Float64Array(n / 2 + 1);
    const im = new Float64Array(n / 2 + 1);
    new RealFft(n).forward(x, re, im);
    for (let k = 0; k <= n / 2; k++) {
      let r = 0;
      let i = 0;
      for (let j = 0; j < n; j++) {
        r += x[j] * Math.cos((2 * Math.PI * k * j) / n);
        i -= x[j] * Math.sin((2 * Math.PI * k * j) / n);
      }
      expect(re[k]).toBeCloseTo(r, 9);
      expect(im[k]).toBeCloseTo(i, 9);
    }
  });
});

describe('drum onsets', () => {
  it('finds every kick, snare and hat within 3 ms, with hats kept off the kicks', () => {
    const beats = steadyBeats(120, 0.25, 12);
    const loop = drumLoop(beats, 12, { firstPosition: 3, chords: PROGRESSION });
    const extractor = new FeatureExtractor(SR);
    extractor.push(loop.track.normalize().samples);
    const onsets = drumOnsets(extractor.finish());

    const kicks = beats.filter((_, i) => (i + 3) % 2 === 0);
    const snares = beats.filter((_, i) => (i + 3) % 2 === 1);
    const hats = [...snares, ...beats.map((t) => t + 0.25)].filter((t) => t < 11.95).sort((a, b) => a - b);
    expect(onsets.kick).toHaveLength(kicks.length);
    expect(onsets.snare).toHaveLength(snares.length);
    expect(onsets.hat).toHaveLength(hats.length);
    expect(worstMiss(onsets.kick.map((o) => o.t), kicks)).toBeLessThan(0.003);
    expect(worstMiss(onsets.snare.map((o) => o.t), snares)).toBeLessThan(0.003);
    expect(worstMiss(onsets.hat.map((o) => o.t), hats)).toBeLessThan(0.003);
  });
});

describe('analyzeAudioFile', () => {
  let loopMap: BeatMap;
  let loop: Loop;

  beforeAll(async () => {
    // 120 BPM, kick on 1 and 3, snare on 2 and 4, hats on the 8ths, a new chord every bar.
    // The first beat is a pickup (beat 4), so the first bar starts on the second beat.
    loop = drumLoop(steadyBeats(120, 0.25, 30), 30, { firstPosition: 3, chords: PROGRESSION });
    loopMap = await analyzeAudioFile(save('loop.wav', loop));
  });

  it('(a) finds 120 BPM and every beat within 15 ms', () => {
    expect(loopMap.bpm).toBeGreaterThan(119.5);
    expect(loopMap.bpm).toBeLessThan(120.5);
    expect(loopMap.beats).toHaveLength(loop.beats.length);
    expect(worstMiss(loopMap.beats, loop.beats)).toBeLessThan(0.015);
  });

  it('(a) puts the downbeats on the chord changes', () => {
    expect(loopMap.downbeatMethod).toBe('harmony');
    expect(loopMap.downbeats).toHaveLength(loop.downbeats.length);
    expect(loopMap.downbeats[0]).toBeCloseTo(0.75, 2);
    expect(worstMiss(loopMap.downbeats, loop.downbeats)).toBeLessThan(0.015);
  });

  it('(a) puts the downbeats on the accented kick when there is no harmony to go on', async () => {
    const accented = drumLoop(steadyBeats(120, 0.25, 20), 20, { firstPosition: 1, fourOnFloor: true, snare: false, accentOne: 1 });
    const map = await analyzeAudioFile(save('accent.wav', accented));
    expect(map.downbeatMethod).toBe('kick');
    expect(worstMiss(map.beats, accented.beats)).toBeLessThan(0.015);
    expect(worstMiss(map.downbeats, accented.downbeats)).toBeLessThan(0.015);
    expect(map.downbeats).toHaveLength(accented.downbeats.length);
  });

  it('locks the beat to the kicks, not to loud off-beat hats', async () => {
    // The failure BLISS's first beat map had: a grid half a beat early, on the hats.
    const hatsLoop = drumLoop(steadyBeats(128, 0.1, 20), 20, { fourOnFloor: true, snare: false, offbeatHats: 2.5 });
    const map = await analyzeAudioFile(save('hats.wav', hatsLoop));
    expect(map.bpm).toBeCloseTo(128, 0);
    expect(worstMiss(map.beats, hatsLoop.beats)).toBeLessThan(0.015);
    expect(map.onsets.snare).toHaveLength(0);
  });

  it('(b) follows a tempo ramp from 118 to 126 BPM to within 20 ms, where one BPM drifts by more than a beat', async () => {
    const ramp = drumLoop(rampBeats(118, 126, 0.2, 30), 30, { chords: PROGRESSION });
    const map = await analyzeAudioFile(save('ramp.wav', ramp));
    expect(map.beats).toHaveLength(ramp.beats.length);
    expect(worstMiss(map.beats, ramp.beats)).toBeLessThan(0.02);
    expect(worstMiss(map.downbeats, ramp.downbeats)).toBeLessThan(0.02);
    expect(map.tempo[0].bpm).toBeLessThan(120);
    expect(map.tempo[map.tempo.length - 1].bpm).toBeGreaterThan(124.5);

    // A single-BPM grid from the first beat at the opening tempo is over a beat off by the end…
    const first = map.beats[0];
    const last = ramp.beats.length - 1;
    const opening = 60 / map.tempo[0].bpm;
    expect(Math.abs(first + last * opening - ramp.beats[last])).toBeGreaterThan(60 / 126);
    // …and even the song's median BPM misses beats by far more than 20 ms in the middle.
    const median = 60 / map.bpm;
    const drift = Math.max(...ramp.beats.map((t, i) => Math.abs(first + i * median - t)));
    expect(drift).toBeGreaterThan(0.08);
  });

  it('(c) finds an impact after a quiet passage, and the riser into it', async () => {
    // Quiet 0–12 s (soft off-beat hats, a quiet pad), a noise riser 9–12 s, then the drop at
    // 12 s: crash, full drums and loud chords to 24 s, then quiet again.
    const song = new Track(30);
    steadyBeats(120, 0, 30).forEach((t, i) => {
      const loud = t >= 12 && t < 24;
      if (i % 4 === 0) song.add(t, chord(PROGRESSION[(i / 4) % 4], 2), loud ? 1 : 0.05);
      if (!loud) {
        song.add(t + 0.25, hat(), 0.03);
        return;
      }
      if (i % 2 === 0) song.add(t, kick());
      else song.add(t, snare(), 0.8);
      song.add(t, hat(), 0.35);
      song.add(t + 0.25, hat(), 0.35);
    });
    song.add(9, riser(3), 0.6);
    song.add(12, crash());
    const map = await analyzeAudioFile(save('drop.wav', song));

    expect(map.hits).toHaveLength(1);
    expect(map.hits[0].t).toBeCloseTo(12, 1);
    expect(map.hits[0].score).toBeGreaterThanOrEqual(0.22);
    expect(map.downbeats).toContain(map.hits[0].t);
    expect(map.risers).toHaveLength(1);
    expect(map.risers[0].t1).toBe(map.hits[0].t);
    expect(map.risers[0].t0).toBeGreaterThan(8.5);
    expect(map.risers[0].t0).toBeLessThan(10);
    expect(map.sections.map((s) => s.t0)).toContain(map.hits[0].t);

    // (d) the envelopes follow it: quiet before the drop, loud after.
    const fps = map.envelope.fps;
    expect(map.envelope.level[Math.round(15 * fps)]).toBeGreaterThan(map.envelope.level[Math.round(5 * fps)] + 0.4);

    // A steady loop has no impacts.
    expect(loopMap.hits).toEqual([]);
  });

  it('(d) writes one envelope value per frame, each 0–1', async () => {
    for (const [map, fps] of [
      [loopMap, 30],
      [await analyzeAudioFile(file('loop.wav'), { fps: 24 }), 24],
    ] as const) {
      expect(map.envelope.fps).toBe(fps);
      for (const band of ['level', 'low', 'mid', 'high'] as const) {
        const values = map.envelope[band];
        expect(values).toHaveLength(Math.ceil(map.duration * fps));
        expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...values)).toBeLessThanOrEqual(1);
        expect(Math.max(...values)).toBeGreaterThan(0.9);
      }
    }
  });

  it('(e) pins half or double time with a tempo range', () => {
    // 150 BPM with a backbeat: also readable as 75 BPM with the snares between the beats.
    const fast = drumLoop(steadyBeats(150, 0.2, 20), 20, {});
    const samples = fast.track.normalize().samples;
    const kicks = fast.beats.filter((_, i) => i % 2 === 0);

    const auto = analyzeSamples(samples, SR, 'fast.wav');
    expect(auto.bpm).toBeCloseTo(150, 0);
    expect(worstMiss(auto.beats, fast.beats)).toBeLessThan(0.015);

    const half = analyzeSamples(samples, SR, 'fast.wav', { tempoRange: [60, 100] });
    expect(half.bpm).toBeCloseTo(75, 0);
    expect(half.beats).toHaveLength(kicks.length);
    expect(worstMiss(half.beats, kicks)).toBeLessThan(0.015);

    // And the other way: 80 BPM, pinned to 140–180, beats on every 8th note.
    const slow = drumLoop(steadyBeats(80, 0.2, 20), 20, {});
    const slowSamples = slow.track.normalize().samples;
    expect(analyzeSamples(slowSamples, SR, 'slow.wav').bpm).toBeCloseTo(80, 0);
    const double = analyzeSamples(slowSamples, SR, 'slow.wav', { tempoRange: [140, 180] });
    expect(double.bpm).toBeCloseTo(160, 0);
    const eighths = slow.beats.flatMap((t) => [t, t + 60 / 160]).filter((t) => t < 19.9);
    expect(worstMiss(double.beats, eighths)).toBeLessThan(0.015);
  });

  it('keeps to the contract: sorted times, bars on beats, tempo every 5 s', () => {
    const sorted = (list: number[]) => list.every((t, i) => i === 0 || t > list[i - 1]);
    expect(loopMap.version).toBe(1);
    expect(loopMap.source).toBe('loop.wav');
    expect(loopMap.duration).toBe(30);
    expect(loopMap.beatsPerBar).toBe(4);
    expect(sorted(loopMap.beats)).toBe(true);
    for (const d of loopMap.downbeats) expect(loopMap.beats).toContain(d);
    expect(loopMap.tempo.map((p) => p.t)).toEqual([0, 5, 10, 15, 20, 25, 30]);
    expect(loopMap.sections[0].t0).toBe(0);
    expect(loopMap.sections[loopMap.sections.length - 1].t1).toBe(30);
    for (const band of ['kick', 'snare', 'hat'] as const) expect(sorted(loopMap.onsets[band])).toBe(true);
    expect(JSON.parse(formatBeatMap(loopMap))).toEqual(loopMap);
  });

  it('measures the tempo curve on the beats themselves', () => {
    const curve = tempoCurve(rampBeats(118, 126, 0, 30), 30);
    expect(curve.map((p) => p.t)).toEqual([0, 5, 10, 15, 20, 25, 30]);
    curve.forEach((p) => expect(p.bpm).toBeCloseTo(118 + (8 * p.t) / 30, 0));
    expect(curve.every((p, i) => i === 0 || p.bpm > curve[i - 1].bpm)).toBe(true);
  });

  it('refuses silence, very short audio and files that are not audio', async () => {
    writeWav(file('silence.wav'), new Float32Array(SR * 5));
    await expect(analyzeAudioFile(file('silence.wav'))).rejects.toThrow('is silent');
    writeWav(file('blip.wav'), new Float32Array(SR / 2).fill(0.1));
    await expect(analyzeAudioFile(file('blip.wav'))).rejects.toThrow('at least 2 s');
    fs.writeFileSync(file('notes.txt'), 'not audio');
    await expect(analyzeAudioFile(file('notes.txt'))).rejects.toThrow(/no audio stream|could not decode/);
    await expect(analyzeAudioFile(file('missing.mp3'))).rejects.toThrow('does not exist');
    await expect(analyzeAudioFile(file('loop.wav'), { tempoRange: [180, 60] })).rejects.toThrow('--tempo-range');
  });
});

describe('analyzeSamples on two music videos', () => {
  // Synthetic stand-ins for the two songs these failures came from (see dropSong and typingSong).
  let drop: Song;
  let dropMap: BeatMap;
  let typing: Song;
  let typingMap: BeatMap;
  /** Hits strictly inside (t0, t1). */
  const hitsWithin = (map: BeatMap, t0: number, t1: number) => map.hits.filter((h) => h.t > t0 && h.t < t1);

  beforeAll(() => {
    drop = dropSong();
    dropMap = analyzeSamples(drop.track.normalize().samples, SR, 'drop.wav');
    typing = typingSong();
    typingMap = analyzeSamples(typing.track.normalize().samples, SR, 'typing.wav');
  });

  it('finds the drop after a riser and snare roll, though the riser already filled the window before it', () => {
    // Was missed: the riser made the previous 1.5 s as loud as the drop.
    const bar8 = drop.bar(8);
    expect(worstMiss(dropMap.hits.map((h) => h.t), [bar8])).toBeLessThan(0.015);
    expect(dropMap.hits.find((h) => Math.abs(h.t - bar8) < 0.015)!.score).toBeGreaterThanOrEqual(0.3);
  });

  it('finds the final hit after a reverse swell, and nothing on the swell\'s rising edge', () => {
    // Was missed, with a spurious hit at bar 19.44 (and 47.77 s in the 120 BPM song).
    expect(worstMiss(dropMap.hits.map((h) => h.t), [drop.bar(20)])).toBeLessThan(0.015);
    expect(hitsWithin(dropMap, drop.bar(19), drop.bar(20) - 0.015)).toEqual([]);
    expect(worstMiss(typingMap.hits.map((h) => h.t), [typing.bar(24)])).toBeLessThan(0.015);
    expect(hitsWithin(typingMap, typing.bar(23), typing.bar(24) - 0.015)).toEqual([]);
  });

  it('finds the riser into the drop and the swell into the final hit', () => {
    // Was empty. The riser runs bars 6–8, but under the pad it climbs audibly only in bar 7.
    const into = (map: BeatMap, t: number) => map.risers.find((r) => Math.abs(r.t1 - t) < 0.015);
    const riser = into(dropMap, dropMap.hits.find((h) => Math.abs(h.t - drop.bar(8)) < 0.015)!.t)!;
    expect(riser).toBeDefined();
    expect(riser.t0).toBeGreaterThan(drop.bar(5.75));
    expect(riser.t0).toBeLessThan(drop.bar(7.25));
    for (const [song, map] of [[drop, dropMap], [typing, typingMap]] as const) {
      const swell = into(map, map.hits.find((h) => Math.abs(h.t - song.bar(map === dropMap ? 20 : 24)) < 0.015)!.t)!;
      expect(swell).toBeDefined();
      expect(swell.t0).toBeGreaterThan(song.bar(map === dropMap ? 19 : 23) - 0.25);
    }
  });

  it('starts sections on the drop and on the break where the drums stop', () => {
    // Was [bars 0–4] and [bars 4–21.4].
    const starts = dropMap.sections.map((s) => s.t0);
    expect(worstMiss(starts, [drop.bar(4), drop.bar(8), drop.bar(16)])).toBeLessThan(0.015);
    const dropSection = dropMap.sections.find((s) => Math.abs(s.t0 - drop.bar(8)) < 0.015)!;
    expect(Math.abs(dropSection.t1 - drop.bar(16))).toBeLessThan(0.015);
  });

  it('keeps beats on the kick grid under typewriter clicks, and on the tempo where only clicks play', () => {
    // Was up to 40 ms off: −32 ms on bar 0, where only clicks play, and ±13–34 ms on the
    // half-time bars under the typing.
    expect(typingMap.beats).toHaveLength(typing.beats.length);
    expect(worstMiss(typingMap.beats, typing.beats)).toBeLessThan(0.012);
    expect(worstMiss(typing.beats, typingMap.beats)).toBeLessThan(0.012);
    const bar0 = typing.beats.filter((t) => t < typing.bar(1));
    expect(worstMiss(typingMap.beats.slice(0, bar0.length), bar0)).toBeLessThan(0.005);
    // The clicks are not drums.
    const clicks = (list: number[]) => list.filter((t) => t < typing.bar(1) - 0.05).length;
    expect(clicks(typingMap.onsets.snare) + clicks(typingMap.onsets.hat)).toBe(0);
    // And beats with no drum after the final hit keep to the tempo too.
    expect(worstMiss(dropMap.beats, drop.beats)).toBeLessThan(0.012);
  });
});
