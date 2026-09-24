import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { captureFrames, captureContactSheet, probeComposition } from '@helios-project/renderer';
import { registerFrameCommands } from '../frames.js';

vi.mock('@helios-project/renderer', () => ({
  captureFrames: vi.fn(),
  captureContactSheet: vi.fn(),
  probeComposition: vi.fn(),
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
        return times.map((t) => Buffer.from(pass === 1 || t === 9 ? `frame@${t}` : `drifted@${t}`));
      });
      await program.parseAsync(['node', 'test', 'verify', 'page.html', '--duration', '12', '--samples', '4']);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errors()).toContain('0s, 3s, 6s');
      expect(errors()).toContain('function of t');
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
