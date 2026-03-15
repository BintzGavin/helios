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

  it('should fallback to mergeCommand if stitcher is provided but outputFile is missing', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: 'merge-cmd' };

    const mockStitcher = { stitch: vi.fn().mockResolvedValue('merged.mp4') };
    const mockMergeAdapter = { execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'ok', stderr: '' }) };
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await executor.execute(spec, {
      stitcher: mockStitcher as any,
      mergeAdapter: mockMergeAdapter as any
    });

    expect(console.warn).toHaveBeenCalledWith('Warning: stitcher provided but outputFile is missing. Falling back to mergeCommand.');
  });

  it('should skip merge step when mergeCommand is missing and no adapters are provided', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await executor.execute(spec);

    expect(console.log).toHaveBeenCalledWith('Skipping merge step (no merge mechanism provided).');
  });

  it('should skip merge step when mergeCommand is present but options.skipMerge is true', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: 'merge-cmd' };

    // Clear the mock so we only see the logs from this test
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleLogSpy.mockClear();

    await executor.execute(spec, { skipMerge: true, outputFile: 'foo' });

    expect(consoleLogSpy).toHaveBeenCalledWith('Skipping merge step (disabled in options).');
  });

  it('should clear timeout when aborted during retry wait', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockRejectedValue(new Error('Retry error'))
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const controller = new AbortController();

    const execPromise = executor.execute(spec, { retries: 1, retryDelay: 500, signal: controller.signal });

    // Give it a moment to hit the retry wait
    await new Promise(resolve => setTimeout(resolve, 50));
    controller.abort();

    await expect(execPromise).rejects.toThrow('Job aborted');
  });

  it('should throw unknown error if no failures and no rejected promises found', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    // Hack internal Promise.allSettled to return an empty array with a rejected status
    vi.spyOn(Promise, 'allSettled').mockResolvedValueOnce([{ status: 'rejected', reason: undefined }] as any);

    await expect(executor.execute(spec)).rejects.toThrow('Job execution failed: Unknown error');
  });

  it('should immediately abort chunk execution if abort signal is already triggered', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    const controller = new AbortController();
    controller.abort();

    await expect(executor.execute(spec, { signal: controller.signal })).rejects.toThrow('Job aborted');
  });

  it('should immediately abort retry attempt if abort signal is already triggered', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockRejectedValue(new Error('Fail once'))
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    const controller = new AbortController();

    // Abort after first execution call
    mockAdapter.execute = vi.fn().mockImplementationOnce(() => {
        controller.abort();
        throw new Error('Fail once');
    });

    await expect(executor.execute(spec, { signal: controller.signal, retries: 1 })).rejects.toThrow('Job aborted');
  });

  it('should filter completed chunks correctly when completedChunkIds is provided', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out1.mp4', command: 'cmd1' }, { id: 2, startFrame: 10, frameCount: 10, outputFile: 'out2.mp4', command: 'cmd2' }], metadata: { totalFrames: 20, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    await executor.execute(spec, { completedChunkIds: [1] });

    // Check that adapter was only called for chunk 2
    expect(mockAdapter.execute).toHaveBeenCalledTimes(1);
    expect(mockAdapter.execute).toHaveBeenCalledWith(expect.objectContaining({
        command: 'cmd2',
    }));
  });
});
