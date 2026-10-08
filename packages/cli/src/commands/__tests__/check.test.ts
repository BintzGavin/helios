import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { registerCheckCommand } from '../check.js';
import { UNTAGGED_WARNING } from '../../utils/video-check.js';

const BT709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+write_colr'];

describe('helios check', () => {
  let dir: string;
  let program: Command;
  let exitSpy: any;
  let errorSpy: any;
  let logSpy: any;
  let stdoutSpy: any;

  /** Encodes a short 160x90, 30 fps H.264 clip; extra args go before the output file. */
  function clip(name: string, inputs: string[], extra: string[] = []): string {
    const file = path.join(dir, name);
    const result = spawnSync(ffmpeg.path, [
      '-v', 'error', '-y', ...inputs,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', ...extra, file,
    ]);
    if (result.status !== 0) throw new Error(result.stderr.toString());
    return file;
  }
  const video = (seconds: number) => ['-f', 'lavfi', '-i', `testsrc=s=160x90:r=30:d=${seconds}`];
  const tone = (seconds: number) => ['-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=48000:duration=${seconds}`];

  async function run(...args: string[]) {
    await program.parseAsync(['node', 'helios', 'check', ...args]);
    const json = stdoutSpy.mock.calls.map((c: any[]) => c[0]).join('');
    return {
      code: exitSpy.mock.calls[0]?.[0],
      json: json ? JSON.parse(json) : undefined,
      log: logSpy.mock.calls.flat().join('\n'),
      errors: errorSpy.mock.calls.flat().join('\n'),
    };
  }

  beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-check-')); });
  afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerCheckCommand(program);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('passes a tagged video with audio and prints exactly one JSON object', async () => {
    const file = clip('tagged.mp4', [...video(2), ...tone(2)], ['-c:a', 'aac', '-ac', '2', '-shortest', ...BT709]);
    const { code, json } = await run(file, '--json');
    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(json).toEqual({
      ok: true,
      file,
      video: {
        codec: 'h264', width: 160, height: 90, fps: 30, duration: expect.any(Number), frames: 60, pixFmt: 'yuv420p',
        color: { matrix: 'bt709', primaries: 'bt709', transfer: 'bt709', range: 'tv' },
      },
      audio: { codec: 'aac', channels: 2, sampleRate: 48000 },
      flash: { ok: true, maxPerSecond: expect.any(Number), worst: null, red: false },
      problems: [],
      warnings: [],
    });
    expect(json.video.duration).toBeCloseTo(2, 1);
  });

  it('warns about an untagged video and reports no audio as null', async () => {
    const { code, json } = await run(clip('untagged.mp4', video(1)), '--json');
    expect(code).toBe(0);
    expect(json.ok).toBe(true);
    expect(json.audio).toBeNull();
    expect(json.video.color).toEqual({ matrix: null, primaries: null, transfer: null, range: null });
    expect(json.warnings).toEqual([UNTAGGED_WARNING]);
  });

  it('warns when the file runs longer than its frames', async () => {
    // 1 s of video with 2 s of audio and no -shortest: 30 frames in a 2 s file.
    const { code, json } = await run(clip('long-audio.mp4', [...video(1), ...tone(2)], ['-c:a', 'aac', ...BT709]), '--json');
    expect(code).toBe(0);
    expect(json.video.frames).toBe(30);
    expect(json.warnings).toHaveLength(1);
    expect(json.warnings[0]).toMatch(/^The file lasts 2\.0\d s, which at 30 fps is 6\d frames, but its video has 30 \(1\.00 s\)/);
    expect(json.warnings[0]).toMatch(/another stream runs past the picture/);
  });

  it('fails a flashing video, in JSON and in the report', async () => {
    const strobe = clip('strobe.mp4', ['-f', 'lavfi', '-i', 'color=c=black:s=160x90:r=30:d=2'],
      ['-vf', "drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill:enable='lt(mod(t*10,2),1)'", ...BT709]);

    const { code, json } = await run(strobe, '--json');
    expect(code).toBe(1);
    expect(json.ok).toBe(false);
    expect(json.flash).toMatchObject({ ok: false, maxPerSecond: 5, red: false, worst: { count: 5 } });
    expect(json.problems).toHaveLength(1);
    expect(json.problems[0]).toMatch(/^The video flashes 5 times in one second \(0\.\d\d s to 1\.\d\d s\), more than the 3 that WCAG 2\.3\.1 allows/);

    exitSpy.mockClear();
    const report = await run(strobe);
    expect(report.code).toBe(1);
    expect(report.log).toMatch(/✗ Flashes: at most 5 in one second/);
    expect(report.log).toMatch(/Problem: The video flashes 5 times/);
    expect(report.log).toMatch(/FAILED: /);
  });

  it('prints one line per check', async () => {
    const { code, log } = await run(clip('report.mp4', [...video(1), ...tone(1)], ['-c:a', 'aac', '-shortest', ...BT709]));
    expect(code).toBe(0);
    const lines = log.split('\n').filter((l: string) => /^[✓!✗] /.test(l));
    expect(lines).toEqual([
      '✓ Video: h264, 160x90, 30 fps, yuv420p',
      '✓ Color: matrix bt709, primaries bt709, transfer bt709, tv range',
      expect.stringMatching(/^✓ Length: 30 frames, 1\.0\d s$/),
      '✓ Audio: aac, 1 channel, 48000 Hz',
      '✓ Flashes: none; WCAG 2.3.1 allows 3 a second',
    ]);
    expect(log).toMatch(/OK: /);
  });

  it('fails without JSON when the file cannot be read', async () => {
    const missing = await run(path.join(dir, 'missing.mp4'), '--json');
    expect(missing.code).toBe(1);
    expect(missing.json).toBeUndefined();
    expect(missing.errors).toMatch(/^Check failed: .*missing\.mp4 does not exist$/);

    errorSpy.mockClear();
    exitSpy.mockClear();
    const broken = path.join(dir, 'broken.mp4');
    fs.writeFileSync(broken, 'not a video');
    const unreadable = await run(broken, '--json');
    expect(unreadable.code).toBe(1);
    expect(unreadable.json).toBeUndefined();
    expect(unreadable.errors).toMatch(/^Check failed: .*broken\.mp4 is not a media file FFmpeg can read \(.+\)$/);
  });

  it('fails without JSON when there is no video stream', async () => {
    const audioOnly = path.join(dir, 'tone.m4a');
    spawnSync(ffmpeg.path, ['-v', 'error', '-y', ...tone(1), '-c:a', 'aac', audioOnly]);
    const { code, json, errors } = await run(audioOnly, '--json');
    expect(code).toBe(1);
    expect(json).toBeUndefined();
    expect(errors).toMatch(/^Check failed: .*tone\.m4a has no video stream$/);
  });
});
