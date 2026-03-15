import { describe, it, expect, vi } from 'vitest';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { WorkerAdapter } from '../../src/types/adapter.js';

describe('JobExecutor Coverage Expansion', () => {
  it('should log error and throw when options.stitcher.stitch fails', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    const mockStitcher = { stitch: vi.fn().mockRejectedValue(new Error('Stitch failed')) };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(executor.execute(spec, {
      stitcher: mockStitcher as any,
      outputFile: 'merged.mp4'
    })).rejects.toThrow('Stitch failed');

    expect(console.error).toHaveBeenCalledWith('Merge step failed:', 'Stitch failed');
  });

  it('should log error and throw when options.mergeAdapter.execute fails', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: 'merge-cmd' };

    const mockMergeAdapter = { execute: vi.fn().mockRejectedValue(new Error('Merge execute failed')) };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(executor.execute(spec, {
      mergeAdapter: mockMergeAdapter as any,
      outputFile: 'merged.mp4'
    })).rejects.toThrow('Merge execute failed');

    expect(console.error).toHaveBeenCalledWith('Merge step failed:', 'Merge execute failed');
  });
});
