import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transcodeMerge } from '../ffmpeg';
import * as child_process from 'child_process';
import * as fs from 'fs';

vi.mock('child_process');
vi.mock('fs');
vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/mock/ffmpeg/path' }
}));

describe('ffmpeg utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('transcodeMerge', () => {
    it('throws if no input files provided', async () => {
      await expect(transcodeMerge([], 'out.mp4', {})).rejects.toThrow('No input files provided for merge');
    });

    it('creates output directory if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any);

      const mockSpawn = vi.fn();
      const mockProcess = {
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await transcodeMerge(['in.mp4'], 'dir/out.mp4', {});

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('dir'), { recursive: true });
    });

    it('spawns ffmpeg with correct arguments', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const mockSpawn = vi.fn();
      let stdinData = '';
      const mockProcess = {
        stderr: { on: vi.fn() },
        stdin: {
          write: vi.fn((data) => { stdinData += data; }),
          end: vi.fn(),
          on: vi.fn()
        },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await transcodeMerge(['in1.mp4', 'in2.mp4'], 'out.mp4', {
        videoCodec: 'libx264',
        audioCodec: 'aac',
        quality: '23',
        preset: 'fast',
      });

      expect(mockSpawn).toHaveBeenCalledWith('/mock/ffmpeg/path', expect.arrayContaining([
        '-f', 'concat',
        '-safe', '0',
        '-protocol_whitelist', 'file,pipe',
        '-i', '-',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-crf', '23',
        '-preset', 'fast',
        '-y', 'out.mp4'
      ]));

      expect(stdinData).toContain('in1.mp4');
      expect(stdinData).toContain('in2.mp4');
    });

    it('rejects if ffmpeg exits with non-zero code', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const mockSpawn = vi.fn();
      const mockProcess = {
        stderr: { on: vi.fn((event, cb) => { if (event === 'data') cb('some error output'); }) },
        stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(1);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await expect(transcodeMerge(['in.mp4'], 'out.mp4', {})).rejects.toThrow('FFmpeg merge failed with code 1');
    });

    it('rejects if ffmpeg process emits error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const mockSpawn = vi.fn();
      const mockProcess = {
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'error') cb(new Error('Spawn error'));
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await expect(transcodeMerge(['in.mp4'], 'out.mp4', {})).rejects.toThrow('Spawn error');
    });

    it('handles stdin error gracefully if EPIPE', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const mockSpawn = vi.fn();
      const mockProcess = {
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn((event, cb) => {
          if (event === 'error') cb({ code: 'EPIPE' });
        }) },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await expect(transcodeMerge(['in.mp4'], 'out.mp4', {})).resolves.toBeUndefined();
    });

    it('rejects if stdin emits non-EPIPE error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const mockSpawn = vi.fn();
      const mockProcess = {
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn(), on: vi.fn((event, cb) => {
          if (event === 'error') cb(new Error('Stdin error'));
        }) },
        on: vi.fn((event, cb) => {
          // don't resolve automatically
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await expect(transcodeMerge(['in.mp4'], 'out.mp4', {})).rejects.toThrow('Stdin error');
    });
  });
});
