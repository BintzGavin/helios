import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { captureFrames, captureContactSheet, probeComposition, readFrameText } from '@helios-project/renderer';
import { registerFrameCommands } from '../frames.js';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

/** A 160x90 grayscale PNG with a white box at x, optionally tweaked pixel by pixel. */
function boxPng(x: number, tweak?: (pixels: Buffer) => void): Buffer {
  const pixels = Buffer.alloc(160 * 90);
  for (let r = 30; r < 50; r++) for (let c = x; c < x + 20; c++) pixels[r * 160 + c] = 255;
  tweak?.(pixels);
  return spawnSync(ffmpeg.path, ['-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '160x90', '-i', '-', '-f', 'image2pipe', '-vcodec', 'png', '-'], { input: pixels }).stdout;
}

vi.mock('@helios-project/renderer', () => ({
  captureFrames: vi.fn(),
  captureContactSheet: vi.fn(),
  probeComposition: vi.fn(),
  readFrameText: vi.fn(),
}));

describe('still and sheet commands', () => {
  let program: Command;
  let exitSpy: any;
  let errorSpy: any;
  let writeSpy: any;

  const errors = () => errorSpy.mock.calls.flat().join(' ');
  const written = () => writeSpy.mock.calls.map((call: any[]) => path.relative(process.cwd(), call[0]));

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    registerFrameCommands(program);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    vi.mocked(probeComposition).mockResolvedValue({ driver: 'helios', durationInSeconds: 12, fps: 30, width: 1080, height: 1920 });
    vi.mocked(captureFrames).mockImplementation(async (_url, times) => times.map(() => Buffer.from('png')));
    vi.mocked(captureContactSheet).mockResolvedValue(Buffer.from('sheet'));
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('still', () => {
    it('writes one PNG per time, at the composition size', async () => {
      await program.parseAsync(['node', 'test', 'still', 'page.html', '--at', '0.5,3']);
      expect(captureFrames).toHaveBeenCalledWith(expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/page\.html$/), [0.5, 3], expect.objectContaining({ width: 1080, height: 1920 }));
      expect(written()).toEqual(['still-0.5s.png', 'still-3s.png']);
    });

    it('treats a local file whose name starts with "http" as a file', async () => {
      await program.parseAsync(['node', 'test', 'still', 'http-demo.html', '--at', '1', '--width', '640', '--height', '360', '--no-serve']);
      expect(vi.mocked(captureFrames).mock.calls[0][0]).toMatch(/^file:\/\/.*\/http-demo\.html$/);
    });

    it('writes a single time to -o', async () => {
      await program.parseAsync(['node', 'test', 'still', 'page.html', '--at', '2', '-o', 'frame.png']);
      expect(written()).toEqual(['frame.png']);
    });

    it('treats -o as a directory for several times', async () => {
      await program.parseAsync(['node', 'test', 'still', 'page.html', '--at', '1,2', '-o', 'frames']);
      expect(written()).toEqual([path.join('frames', 'still-1s.png'), path.join('frames', 'still-2s.png')]);
    });

    it('does not load the page just to size it when --width and --height are given', async () => {
      await program.parseAsync(['node', 'test', 'still', 'page.html', '--at', '1', '--width', '640', '--height', '360', '--crop', '10,20,300,200']);
      expect(probeComposition).not.toHaveBeenCalled();
      expect(captureFrames).toHaveBeenCalledWith(expect.any(String), [1], expect.objectContaining({ width: 640, height: 360, crop: { x: 10, y: 20, width: 300, height: 200 } }));
    });

    it('rejects times that are not numbers', async () => {
      await program.parseAsync(['node', 'test', 'still', 'page.html', '--at', 'soon']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('--at');
      expect(captureFrames).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    const logs = () => vi.mocked(console.log).mock.calls.flat().join(' ');

    it('renders sample frames forward and then in reverse, cold, and passes a pure page', async () => {
      vi.mocked(captureFrames).mockImplementation(async (_url, times) => times.map((t) => Buffer.from(`frame@${t}`)));
      await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '12', '--samples', '4']);
      expect(vi.mocked(captureFrames).mock.calls.map((call) => call[1])).toEqual([[0, 3, 6, 9], [9, 6, 3, 0]]);
      expect(exitSpy).not.toHaveBeenCalled();
      expect(logs()).toContain('identical');
    });

    it('fails a page whose frames depend on what was rendered before', async () => {
      let pass = 0;
      vi.mocked(captureFrames).mockImplementation(async (_url, times) => {
        pass++;
        return times.map((t) => (pass === 1 || t === 9 ? boxPng(10 + t) : boxPng(40 + t)));
      });
      await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '12', '--samples', '4', '--width', '160', '--height', '90']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('0s, 3s, 6s');
      expect(errors()).toContain('function of t');
    });

    it('ignores a few pixels of rendering noise, but says so', async () => {
      let pass = 0;
      vi.mocked(captureFrames).mockImplementation(async (_url, times) => {
        pass++;
        return times.map((t) => boxPng(10 + t, pass === 2 ? (p) => { for (let i = 0; i < 8; i++) p[(30 + i) * 160 + 9 + t] = 7; } : undefined));
      });
      await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '12', '--samples', '4', '--width', '160', '--height', '90']);
      expect(exitSpy).not.toHaveBeenCalled();
      expect(logs()).toContain('rendering noise');
    });

    it('takes the duration from the composition', async () => {
      vi.mocked(captureFrames).mockImplementation(async (_url, times) => times.map((t) => Buffer.from(`frame@${t}`)));
      await program.parseAsync(['node', 'test', 'verify', 'page.html']);
      expect(vi.mocked(captureFrames).mock.calls[0][1]).toEqual([0, 2, 4, 6, 8, 10]);
    });

    it('asks for --duration when the page does not declare one', async () => {
      vi.mocked(probeComposition).mockResolvedValue({ driver: 'hook', hook: 'renderAt' });
      await program.parseAsync(['node', 'test', 'verify', 'page.html']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('--duration');
      expect(captureFrames).not.toHaveBeenCalled();
    });

    it('names the canvas readback trap when frames depend on history', async () => {
      let pass = 0;
      vi.mocked(captureFrames).mockImplementation(async (_url, times) => {
        pass++;
        return times.map((t) => (pass === 1 ? boxPng(10 + t) : boxPng(40 + t)));
      });
      await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '12', '--samples', '4', '--width', '160', '--height', '90']);
      expect(errors()).toMatch(/^Verify failed: Frames at 0s, 3s, 6s, 9s differ depending on what was rendered before them/);
      expect(errors()).toContain('will-change');
      expect(errors()).toContain("getContext('2d', { willReadFrequently: true })");
      expect(errors()).toContain('reset the context state');
    });

    describe('--cues and --json', () => {
      let dir: string;
      let stdout: string[];
      const cueFile = (name: string, content: string) => {
        const file = path.join(dir, name);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, content);
        return file;
      };
      // The words on screen at each time: "hello" from 1 s, "world" from 2 s.
      const lyrics = (times: number[]) => times.map((t) => ({ text: [t >= 1 ? 'Hello' : '', t >= 2 ? 'world.' : ''].filter(Boolean), drawn: [] }));

      beforeEach(() => {
        dir = path.join(os.tmpdir(), `helios-verify-cues-${process.pid}`);
        // This block writes real cue files.
        vi.mocked(fs.writeFileSync).mockRestore();
        vi.mocked(fs.mkdirSync).mockRestore();
        stdout = [];
        vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: any) => { stdout.push(String(chunk)); return true; }) as any);
        vi.mocked(captureFrames).mockImplementation(async (_url, times) => times.map((t) => Buffer.from(`frame@${t}`)));
        vi.mocked(readFrameText).mockImplementation(async (_url, times) => lyrics(times));
      });

      afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

      it('reads the text at a few times inside every cue, in one page session, and passes when each cue shows', async () => {
        const file = cueFile('lyrics.srt', '1\n00:00:01,000 --> 00:00:02,000\nHello\n\n2\n00:00:02,000 --> 00:00:03,000\nworld\n');
        await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '4', '--cues', file]);
        expect(readFrameText).toHaveBeenCalledTimes(1);
        expect(vi.mocked(readFrameText).mock.calls[0][1]).toEqual([1.12, 1.5, 1.88, 2.12, 2.5, 2.88]);
        expect(vi.mocked(readFrameText).mock.calls[0][2]).toEqual(expect.objectContaining({ width: 1080, height: 1920 }));
        expect(exitSpy).not.toHaveBeenCalled();
        expect(logs()).toContain('identical');
        expect(logs()).toContain('2/2 cues on screen at their time.');
      });

      it('fails and names the cues that are not on screen at their time', async () => {
        const file = cueFile('words.json', JSON.stringify({ words: [{ w: 'hello', t0: 1, t1: 1.5 }, { w: 'gentlemen', t0: 1.5, t1: 1.9 }] }));
        await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '4', '--cues', file]);
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(logs()).toContain('identical');
        expect(errors()).toMatch(/^1 of 2 cues are not on screen at their time: "gentlemen" \(1\.5–1\.9 s\)/);
      });

      it('--json prints one object with both checks, and exits 0 when they pass', async () => {
        const file = cueFile('lyrics.vtt', 'WEBVTT\n\n00:01.000 --> 00:02.000\nHello\n');
        await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '4', '--samples', '2', '--cues', file, '--json']);
        expect(exitSpy).not.toHaveBeenCalled();
        expect(JSON.parse(stdout.join(''))).toEqual({
          ok: true,
          purity: { ok: true, samples: 2, differing: [], noisy: [], message: '2 sampled frames are identical rendered in order and in reverse: each frame depends only on t.' },
          cues: { ok: true, total: 1, shown: 1, missing: [], message: '1/1 cues on screen at their time.' },
        });
      });

      it('--json reports failures in the object and exits 1', async () => {
        const file = cueFile('lyrics.json', JSON.stringify([{ text: 'world', start: 1, end: 1.5 }]));
        let pass = 0;
        vi.mocked(captureFrames).mockImplementation(async (_url, times) => {
          pass++;
          return times.map((t) => (pass === 1 ? boxPng(10 + t) : boxPng(40 + t)));
        });
        await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '4', '--samples', '2', '--width', '160', '--height', '90', '--cues', file, '--json']);
        expect(exitSpy).toHaveBeenCalledWith(1);
        const result = JSON.parse(stdout.join(''));
        expect(result.ok).toBe(false);
        expect(result.purity).toEqual(expect.objectContaining({ ok: false, samples: 2, differing: [0, 2], noisy: [] }));
        expect(result.purity.message).toMatch(/^Frames at 0s, 2s differ depending on what was rendered before them/);
        expect(result.cues).toEqual(expect.objectContaining({
          ok: false, total: 1, shown: 0,
          missing: [{ text: 'world', start: 1, end: 1.5, seen: 'Hello' }],
        }));
        expect(result.cues.message).toMatch(/^1 of 1 cues are not on screen at their time: "world" \(1–1\.5 s\)/);
      });

      it('--json leaves out "cues" without --cues, and keeps logs off stdout', async () => {
        vi.mocked(captureFrames).mockImplementation(async (_url, times) => {
          console.log('Initializing pool of 1 browsers/pages...');
          return times.map((t) => Buffer.from(`frame@${t}`));
        });
        const stderr = vi.spyOn(process.stderr, 'write').mockImplementation((() => true) as any);
        await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '4', '--json']);
        const result = JSON.parse(stdout.join(''));
        expect(Object.keys(result)).toEqual(['ok', 'purity']);
        expect(stderr.mock.calls.flat().join('')).toContain('Initializing pool');
        expect(vi.mocked(console.log)).not.toHaveBeenCalled();
      });

      it('reports a missing cue file or a page error on stderr, with no JSON', async () => {
        await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '4', '--cues', path.join(dir, 'nope.srt'), '--json']);
        expect(errors()).toMatch(/^Verify failed: Could not read .*nope\.srt: no such file/);
        expect(stdout).toEqual([]);
        expect(captureFrames).not.toHaveBeenCalled();

        vi.mocked(errorSpy).mockClear();
        const file = cueFile('lyrics.srt', '00:00:01,000 --> 00:00:02,000\nHello\n');
        vi.mocked(readFrameText).mockRejectedValue(new Error('window.renderAt(1.12) threw: boom'));
        await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '4', '--cues', file, '--json']);
        expect(errors()).toBe('Verify failed: window.renderAt(1.12) threw: boom');
        expect(stdout).toEqual([]);
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('sheet', () => {
    const sheetTimes = () => vi.mocked(captureContactSheet).mock.calls.at(-1)![1];

    it('--every takes one frame per interval across the duration', async () => {
      await program.parseAsync(['node', 'test', 'sheet', 'page.html', '--every', '1', '--duration', '4']);
      expect(sheetTimes()).toEqual([0, 1, 2, 3]);
      expect(written()).toEqual(['sheet.png']);
    });

    it('--strip takes every frame in the range', async () => {
      await program.parseAsync(['node', 'test', 'sheet', 'page.html', '--strip', '2:2.5', '--fps', '10']);
      expect(sheetTimes()).toEqual([2, 2.1, 2.2, 2.3, 2.4, 2.5]);
    });

    it('--at takes exact times; --cols, --cell-width and --crop pass through', async () => {
      await program.parseAsync(['node', 'test', 'sheet', 'page.html', '--at', '0,4.5', '--cols', '2', '--cell-width', '320', '--crop', '0,0,540,960', '-o', 'look.png']);
      expect(captureContactSheet).toHaveBeenCalledWith(expect.any(String), [0, 4.5], expect.objectContaining({ columns: 2, cellWidth: 320, crop: { x: 0, y: 0, width: 540, height: 960 } }));
      expect(written()).toEqual(['look.png']);
    });

    it('defaults to 12 frames across the composition', async () => {
      await program.parseAsync(['node', 'test', 'sheet', 'page.html']);
      expect(sheetTimes()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it('asks for --duration when the page does not declare one', async () => {
      vi.mocked(probeComposition).mockResolvedValue({ driver: 'hook', hook: 'renderAt' });
      await program.parseAsync(['node', 'test', 'sheet', 'page.html', '--every', '1']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('--duration');
      expect(captureContactSheet).not.toHaveBeenCalled();
    });

    it('refuses more frames than fit on a sheet', async () => {
      await program.parseAsync(['node', 'test', 'sheet', 'page.html', '--strip', '0:10', '--fps', '30']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('frames');
      expect(captureContactSheet).not.toHaveBeenCalled();
    });
  });
});
