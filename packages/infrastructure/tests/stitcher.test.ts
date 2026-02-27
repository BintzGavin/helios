import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FfmpegStitcher } from '../src/stitcher/ffmpeg-stitcher.js';
import { WorkerAdapter, WorkerJob, WorkerResult } from '../src/types/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Mock fs/promises
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

describe('FfmpegStitcher', () => {
  let mockAdapter: WorkerAdapter;
  let stitcher: FfmpegStitcher;

  beforeEach(() => {
    mockAdapter = {
      execute: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
        durationMs: 100,
      } as WorkerResult),
    };
    stitcher = new FfmpegStitcher(mockAdapter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error if no inputs are provided', async () => {
    await expect(stitcher.stitch([], 'output.mp4')).rejects.toThrow(
      'No input files provided for stitching'
    );
  });

  it('should generate concat list and run ffmpeg', async () => {
    const inputs = ['/path/to/1.mp4', '/path/to/2.mp4'];
    const output = 'output.mp4';

    await stitcher.stitch(inputs, output);

    // Verify file writing
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    const [filePath, content] = (fs.writeFile as any).mock.calls[0];

    expect(filePath).toContain('concat-');
    expect(content).toContain("file '/path/to/1.mp4'");
    expect(content).toContain("file '/path/to/2.mp4'");

    // Verify execution
    expect(mockAdapter.execute).toHaveBeenCalledTimes(1);
    const job = (mockAdapter.execute as any).mock.calls[0][0] as WorkerJob;

    expect(job.command).toBe('ffmpeg');
    expect(job.args).toContain('-f');
    expect(job.args).toContain('concat');
    expect(job.args).toContain(output);
    expect(job.args).toContain(filePath); // Should pass the generated file path

    // Verify cleanup
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledWith(filePath);
  });

  it('should handle ffmpeg errors', async () => {
    mockAdapter.execute = vi.fn().mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'ffmpeg error',
      durationMs: 100,
    } as WorkerResult);

    const inputs = ['/path/to/1.mp4'];
    await expect(stitcher.stitch(inputs, 'output.mp4')).rejects.toThrow(
      'FFmpeg stitching failed with exit code 1: ffmpeg error'
    );

    // Should still cleanup
    expect(fs.unlink).toHaveBeenCalledTimes(1);
  });

  it('should cleanup temp file even if write fails', async () => {
    (fs.writeFile as any).mockRejectedValueOnce(new Error('Write failed'));

    const inputs = ['/path/to/1.mp4'];
    await expect(stitcher.stitch(inputs, 'output.mp4')).rejects.toThrow('Write failed');

    // Should attempt cleanup (though it might fail if file wasn't created, logic handles it)
    expect(fs.unlink).toHaveBeenCalledTimes(1);
  });
});
