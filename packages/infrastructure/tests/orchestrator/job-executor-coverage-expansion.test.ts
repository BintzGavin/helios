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

  it('should throw the promise rejection reason if no explicit failures are captured', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    // Hack internal Promise.allSettled to simulate a rejected promise with a specific reason
    vi.spyOn(Promise, 'allSettled').mockResolvedValueOnce([{ status: 'rejected', reason: new Error('Simulated rejection reason') }] as any);

    await expect(executor.execute(spec)).rejects.toThrow('Simulated rejection reason');
  });

  it('should explicitly skip merge when skipMerge is true and mergeCommand is undefined', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: undefined as any };

    // Clear the mock so we only see the logs from this test
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleLogSpy.mockClear();

    await executor.execute(spec, { skipMerge: true, outputFile: 'foo' });

    expect(consoleLogSpy).toHaveBeenCalledWith('Skipping merge step (disabled in options).');
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

  it('should throw Error if mergeCommand execution returns non-zero exit code', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: 'merge-cmd' };

    const mockMergeAdapter = { execute: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Merge error' }) };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(executor.execute(spec, {
      mergeAdapter: mockMergeAdapter as any,
      outputFile: 'merged.mp4'
    })).rejects.toThrow('Merge failed with exit code 1: Merge error');

    expect(console.error).toHaveBeenCalledWith('Merge step failed:', 'Merge failed with exit code 1: Merge error');
  });

  it('should fallback to this.adapter for merge if options.mergeAdapter is omitted', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: 'merge-cmd' };

    await executor.execute(spec);

    expect(mockAdapter.execute).toHaveBeenCalledWith(expect.objectContaining({
        command: 'merge-cmd',
    }));
  });

  it('should immediately abort chunk execution if abort signal is triggered during retry timeout wait', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockRejectedValue(new Error('Retry error'))
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const controller = new AbortController();

    // In executor.ts line 147 it waits for timeout, and then checks if aborted
    // We will abort *after* the execution promise resolves in rejection, so it hits the retry delay catch block.
    // The previous test "should clear timeout when aborted during retry wait" tests line 144, but not the check at 148.
    // To ensure line 148 is hit, we need the timeout promise to resolve (the timeout happens), and then after it resolves, check if aborted.
    // Since the event listener resolves the promise early and clears timeout, the check at 148 relies on `aborted` being true.
    mockAdapter.execute = vi.fn().mockImplementationOnce(async () => {
      // Setup a background task to abort the controller after a short delay,
      // but before the retryDelay finishes, triggering the abort event listener,
      // or right when it wakes up.
      setTimeout(() => controller.abort(), 10);
      throw new Error('Retry error');
    });

    await expect(executor.execute(spec, { retries: 1, retryDelay: 50, signal: controller.signal })).rejects.toThrow('Job aborted');
  });

  it('should throw AbortError if signal is aborted explicitly before starting a chunk execution loop', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    const controller = new AbortController();

    // Make signal aborted right before entering the while(true) loop by intercepting chunk.shift()
    // or by letting it enter the loop but controller is already aborted.
    // We already tested pre-aborted before execute is called. Here we test if it aborts during the loop queue.
    // The easiest way to hit lines 149-153 is to just mutate aborted before the chunk logic evaluates it inside the while loop.
    Object.defineProperty(controller.signal, 'aborted', {
      get: vi.fn().mockReturnValueOnce(false).mockReturnValue(true) // Start false to enter execute, then true to abort in while loop
    });

    await expect(executor.execute(spec, { signal: controller.signal })).rejects.toThrow('Job aborted');
  });

  it('should explicitly throw rejection reason if chunk Promise fails with an object containing reason property', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    // Hack Promise.allSettled to return a rejected status with an object that is NOT an Error instance but HAS a reason property?
    // Wait, the logic is: `if (rejected && rejected.status === 'rejected') { throw rejected.reason; }`
    // This handles any rejected reason, we just need `failures.length === 0` which means the reason was NOT an Error instance.
    vi.spyOn(Promise, 'allSettled').mockResolvedValueOnce([{ status: 'rejected', reason: 'Primitive string reason' }] as any);

    await expect(executor.execute(spec)).rejects.toThrow('Primitive string reason');
  });

  it('should throw Unknown error if Promise.allSettled rejects but rejected item has no reason', async () => {
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    const executor = new JobExecutor(mockAdapter);
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    // Simulate rejected status but with NO reason so it falls through to the 'Unknown error' error
    vi.spyOn(Promise, 'allSettled').mockResolvedValueOnce([{ status: 'rejected' }] as any);

    await expect(executor.execute(spec)).rejects.toThrow('Job execution failed: Unknown error');
  });
});
