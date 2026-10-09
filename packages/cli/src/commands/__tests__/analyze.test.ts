import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { defaultOutputPath, parseTempoRange, registerAnalyzeCommand } from '../analyze.js';
import { drumLoop, steadyBeats, writeWav } from '../../utils/audio/__tests__/synth.js';

describe('helios analyze command', () => {
  let dir: string;
  let audio: string;
  let program: Command;
  let logSpy: any;
  let errorSpy: any;
  let exitSpy: any;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-analyze-cmd-'));
    audio = path.join(dir, 'song.wav');
    writeWav(audio, drumLoop(steadyBeats(120, 0.25, 8), 8, { firstPosition: 3, accentOne: 1 }).track.normalize().samples);
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    program = new Command();
    registerAnalyzeCommand(program);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes <name>.beats.json next to the audio and prints a one-line summary', async () => {
    await program.parseAsync(['node', 'helios', 'analyze', audio]);

    const out = path.join(dir, 'song.beats.json');
    expect(exitSpy).not.toHaveBeenCalled();
    expect(fs.existsSync(out)).toBe(true);
    const map = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(Object.keys(map)).toEqual([
      'version', 'source', 'duration', 'bpm', 'tempo', 'beatsPerBar', 'beats', 'downbeats',
      'downbeatMethod', 'sections', 'hits', 'onsets', 'risers', 'envelope',
    ]);
    expect(map.source).toBe('song.wav');
    expect(map.envelope.level).toHaveLength(240);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toMatch(
      /^Wrote .*song\.beats\.json: 120\.0 BPM \(1\d\d\.\d–1\d\d\.\d\), 16 beats, 4 bars, 0 hits, 1 section$/,
    );
  });

  it('takes -o, --fps, --tempo-range and --beats-per-bar', async () => {
    const out = path.join(dir, 'nested', 'map.json');
    await program.parseAsync([
      'node', 'helios', 'analyze', audio, '-o', out, '--fps', '60', '--tempo-range', '100:140', '--beats-per-bar', '2',
    ]);

    expect(exitSpy).not.toHaveBeenCalled();
    const map = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(map.envelope.fps).toBe(60);
    expect(map.envelope.high).toHaveLength(480);
    expect(map.beatsPerBar).toBe(2);
    expect(map.downbeats).toHaveLength(8);
  });

  it.each([
    [['missing.mp3'], 'does not exist'],
    [['song.wav', '--tempo-range', 'fast'], '--tempo-range takes min:max'],
    [['song.wav', '--tempo-range', '180:90'], '--tempo-range must be min:max BPM'],
    [['song.wav', '--fps', '0'], '--fps must be a positive number'],
    [['song.wav', '--beats-per-bar', '3.5'], '--beats-per-bar must be a positive whole number'],
  ])('fails with a reason for %j', async (args, reason) => {
    const [file, ...rest] = args;
    await program.parseAsync(['node', 'helios', 'analyze', path.join(dir, file), ...rest]);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/^Analyze failed: /));
    expect(errorSpy.mock.calls[0][0]).toContain(reason);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('names the output after the audio file', () => {
    expect(defaultOutputPath('music/song.mp3')).toBe(path.join('music', 'song.beats.json'));
    expect(defaultOutputPath('take.2.m4a')).toBe('take.2.beats.json');
    expect(parseTempoRange('90:180')).toEqual([90, 180]);
    expect(parseTempoRange(' 60.5 : 100 ')).toEqual([60.5, 100]);
  });
});
