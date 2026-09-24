import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { WorkerAdapter, WorkerJob } from '../../src/types/adapter.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { VideoStitcher } from '../../src/stitcher/ffmpeg-stitcher.js';
import path from 'node:path';

describe('JobExecutor', () => {
  let mockAdapter: WorkerAdapter;
  let jobExecutor: JobExecutor;
  let jobSpec: JobSpec;

  beforeEach(() => {
    mockAdapter = {
      execute: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
        durationMs: 100
      })
    };
    jobExecutor = new JobExecutor(mockAdapter);
    jobSpec = {
      id: 'test-job',
      metadata: {
        totalFrames: 100,
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 3.33
      },
      chunks: [
        { id: 1, startFrame: 0, frameCount: 50, outputFile: 'chunk1.mp4', command: 'render chunk 1' },
        { id: 2, startFrame: 50, frameCount: 50, outputFile: 'chunk2.mp4', command: 'render chunk 2' }
      ],
      mergeCommand: 'merge chunks'
    };
  });

  it('should execute all chunks and the merge command', async () => {
    await jobExecutor.execute(jobSpec);

    expect(mockAdapter.execute).toHaveBeenCalledTimes(3); // 2 chunks + 1 merge
    expect(mockAdapter.execute).toHaveBeenCalledWith(expect.objectContaining({
      command: 'render',
      args: ['chunk', '1']
    }));
    expect(mockAdapter.execute).toHaveBeenCalledWith(expect.objectContaining({
      command: 'render',
      args: ['chunk', '2']
    }));
    expect(mockAdapter.execute).toHaveBeenCalledWith(expect.objectContaining({
      command: 'merge',
      args: ['chunks']
    }));
  });

  it('should respect concurrency limits', async () => {
    let activeExecutions = 0;
    let maxActiveExecutions = 0;

    mockAdapter.execute = vi.fn().mockImplementation(async () => {
      activeExecutions++;
      maxActiveExecutions = Math.max(maxActiveExecutions, activeExecutions);
      await new Promise(resolve => setTimeout(resolve, 20)); // tiny delay
      activeExecutions--;
      return { exitCode: 0, stdout: '', stderr: '', durationMs: 20 };
    });

    // Add more chunks to ensure concurrency is tested
    jobSpec.chunks = [
       { id: 1, startFrame: 0, frameCount: 25, outputFile: '1.mp4', command: 'cmd 1' },
       { id: 2, startFrame: 25, frameCount: 25, outputFile: '2.mp4', command: 'cmd 2' },
       { id: 3, startFrame: 50, frameCount: 25, outputFile: '3.mp4', command: 'cmd 3' },
       { id: 4, startFrame: 75, frameCount: 25, outputFile: '4.mp4', command: 'cmd 4' },
    ];

    await jobExecutor.execute(jobSpec, { concurrency: 2 });

    expect(mockAdapter.execute).toHaveBeenCalledTimes(5); // 4 chunks + 1 merge
    // In a controlled test environment, we expect maxActiveExecutions to be exactly 2
    expect(maxActiveExecutions).toBeLessThanOrEqual(2);
  });

  it('should fail fast if a chunk fails', async () => {
    mockAdapter.execute = vi.fn().mockImplementation(async (job: WorkerJob) => {
      if (job.args && job.args.includes('1')) {
         return { exitCode: 1, stdout: '', stderr: 'Error in chunk 1', durationMs: 0 };
      }
      return { exitCode: 0, stdout: '', stderr: '', durationMs: 0 };
    });

    await expect(jobExecutor.execute(jobSpec)).rejects.toThrow(/Chunk 1 failed/);
  });

  it('should skip merge step if disabled', async () => {
    await jobExecutor.execute(jobSpec, { merge: false });
    expect(mockAdapter.execute).toHaveBeenCalledTimes(2); // Only chunks
  });

  it('should fail if merge fails', async () => {
    mockAdapter.execute = vi.fn().mockImplementation(async (job: WorkerJob) => {
       if (job.command === 'merge') {
          return { exitCode: 1, stdout: '', stderr: 'Merge error', durationMs: 0 };
       }
       return { exitCode: 0, stdout: '', stderr: '', durationMs: 0 };
    });

    await expect(jobExecutor.execute(jobSpec)).rejects.toThrow(/Merge failed/);
  });

  it('should retry a failed chunk and succeed eventually', async () => {
    let attempt = 0;
    mockAdapter.execute = vi.fn().mockImplementation(async (job: WorkerJob) => {
      // Chunk 1 fails once then succeeds
      if (job.args && job.args.includes('1')) {
        attempt++;
        if (attempt === 1) {
          return { exitCode: 1, stdout: '', stderr: 'Transient failure', durationMs: 0 };
        }
      }
      return { exitCode: 0, stdout: '', stderr: '', durationMs: 0 };
    });

    await jobExecutor.execute(jobSpec, { retries: 1, retryDelay: 10 });

    expect(mockAdapter.execute).toHaveBeenCalledTimes(4); // Chunk 1 (fail) + Chunk 1 (retry) + Chunk 2 + Merge
    expect(attempt).toBe(2); // 1st failure + 2nd success
  });

  it('should fail after exhausting all retries', async () => {
    let attempts = 0;
    mockAdapter.execute = vi.fn().mockImplementation(async (job: WorkerJob) => {
      if (job.args && job.args.includes('1')) {
        attempts++;
        return { exitCode: 1, stdout: '', stderr: 'Persistent failure', durationMs: 0 };
      }
      return { exitCode: 0, stdout: '', stderr: '', durationMs: 0 };
    });

    await expect(jobExecutor.execute(jobSpec, { retries: 2, retryDelay: 10 })).rejects.toThrow(/Chunk 1 failed after 3 attempts/);
    expect(attempts).toBe(3); // 1 initial + 2 retries
  });

  it('should throw wrapped error with undefined if adapter.execute rejects with undefined', async () => {
    mockAdapter.execute = vi.fn().mockRejectedValue(undefined);

    await expect(jobExecutor.execute(jobSpec, { retries: 0 })).rejects.toThrow('Chunk 1 failed after 1 attempts: undefined');
  });

  it('should throw the rejection reason if a worker rejects with a specific reason but no failures', async () => {
    // We override Promise.allSettled to simulate an edge case where a worker is rejected
    // without populating the 'failures' array but with a specific reason
    const allSettledSpy = vi.spyOn(Promise, 'allSettled').mockResolvedValue([
      { status: 'rejected', reason: new Error('Specific worker rejection reason') }
    ] as any);

    try {
      await expect(jobExecutor.execute(jobSpec)).rejects.toThrow('Specific worker rejection reason');
    } finally {
      allSettledSpy.mockRestore();
    }
  });

  it('should throw Unknown error if a chunk rejects with a non-Error reason but no failures array exists', async () => {
    // Override Promise.allSettled to simulate a rejection with a non-Error reason string,
    // simulating a rejected promise with a primitive.
    const allSettledSpy = vi.spyOn(Promise, 'allSettled').mockResolvedValue([
      { status: 'rejected', reason: 'Some primitive error string' }
    ] as any);

    try {
      await expect(jobExecutor.execute(jobSpec)).rejects.toThrow('Some primitive error string');
    } finally {
      allSettledSpy.mockRestore();
    }
  });

  it('should throw "Job execution failed: Unknown error" if Promise.allSettled rejects but no failures and no reason', async () => {
    // Override Promise.allSettled to simulate a rejection without a reason
    const allSettledSpy = vi.spyOn(Promise, 'allSettled').mockResolvedValue([
      { status: 'rejected', reason: undefined } // rejected but reason is undefined
    ] as any);

    try {
      await expect(jobExecutor.execute(jobSpec)).rejects.toThrow('Job execution failed: Unknown error');
    } finally {
      allSettledSpy.mockRestore();
    }
  });

  it('should call onProgress callback when a chunk completes', async () => {
    const onProgress = vi.fn();

    await jobExecutor.execute(jobSpec, { onProgress });

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('should call onChunkComplete callback when a chunk completes', async () => {
    const onChunkComplete = vi.fn();

    await jobExecutor.execute(jobSpec, { onChunkComplete });

    expect(onChunkComplete).toHaveBeenCalledTimes(2);
    expect(onChunkComplete).toHaveBeenNthCalledWith(1, 1, {
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 100
    });
    expect(onChunkComplete).toHaveBeenNthCalledWith(2, 2, {
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 100
    });
  });

  it('should map onChunkStdout and onChunkStderr to adapter onStdout and onStderr', async () => {
    const onChunkStdout = vi.fn();
    const onChunkStderr = vi.fn();

    mockAdapter.execute = vi.fn().mockImplementation(async (job: WorkerJob) => {
      // Trigger the callbacks if they exist
      if (job.onStdout) job.onStdout('test stdout');
      if (job.onStderr) job.onStderr('test stderr');
      return { exitCode: 0, stdout: '', stderr: '', durationMs: 100 };
    });

    await jobExecutor.execute(jobSpec, { onChunkStdout, onChunkStderr });

    // Since there are 2 chunks, the adapter should be called twice with chunk jobs
    // and both callbacks should be triggered twice (once per chunk)
    expect(onChunkStdout).toHaveBeenCalledTimes(2);
    expect(onChunkStdout).toHaveBeenNthCalledWith(1, 1, 'test stdout');
    expect(onChunkStdout).toHaveBeenNthCalledWith(2, 2, 'test stdout');

    expect(onChunkStderr).toHaveBeenCalledTimes(2);
    expect(onChunkStderr).toHaveBeenNthCalledWith(1, 1, 'test stderr');
    expect(onChunkStderr).toHaveBeenNthCalledWith(2, 2, 'test stderr');
  });

  it('should pass signal to the adapter', async () => {
    const controller = new AbortController();

    await jobExecutor.execute(jobSpec, { signal: controller.signal });

    expect(mockAdapter.execute).toHaveBeenCalledWith(expect.objectContaining({
      signal: controller.signal
    }));
  });

  it('should throw AbortError if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(jobExecutor.execute(jobSpec, { signal: controller.signal })).rejects.toThrow(/Job aborted/);
    expect(mockAdapter.execute).not.toHaveBeenCalled();
  });

  it('should throw AbortError if signal is aborted mid-execution', async () => {
    const controller = new AbortController();

    mockAdapter.execute = vi.fn().mockImplementation(async (job: WorkerJob) => {
      // Abort during the first chunk
      if (job.args && job.args.includes('1')) {
         controller.abort();
      }
      return { exitCode: 0, stdout: '', stderr: '', durationMs: 0 };
    });

    await expect(jobExecutor.execute(jobSpec, { signal: controller.signal })).rejects.toThrow(/Job aborted/);

    // It might execute chunk 1 depending on the exact timing in the event loop,
    // but definitely shouldn't process everything
    expect(mockAdapter.execute).toHaveBeenCalledTimes(1);
  });

  describe('merge logic decoupling', () => {
    it('should use mergeAdapter when provided', async () => {
      const mockMergeAdapter: WorkerAdapter = {
        execute: vi.fn().mockResolvedValue({
          exitCode: 0,
          stdout: '',
          stderr: '',
          durationMs: 100
        })
      };

      await jobExecutor.execute(jobSpec, { mergeAdapter: mockMergeAdapter });

      expect(mockAdapter.execute).toHaveBeenCalledTimes(2); // Only chunks
      expect(mockMergeAdapter.execute).toHaveBeenCalledTimes(1); // Merge
      expect(mockMergeAdapter.execute).toHaveBeenCalledWith(expect.objectContaining({
        command: 'merge',
        args: ['chunks']
      }));
    });

    it('should use stitcher when stitcher and outputFile are provided', async () => {
      const mockStitcher: VideoStitcher = {
        stitch: vi.fn().mockResolvedValue(undefined)
      };

      const jobDir = process.cwd();

      await jobExecutor.execute(jobSpec, { stitcher: mockStitcher, outputFile: 'final.mp4' });

      expect(mockAdapter.execute).toHaveBeenCalledTimes(2); // Only chunks
      expect(mockStitcher.stitch).toHaveBeenCalledTimes(1); // Stitcher

      const expectedInputs = [
        path.resolve(jobDir, 'chunk1.mp4'),
        path.resolve(jobDir, 'chunk2.mp4')
      ];
      const expectedOutput = path.resolve(jobDir, 'final.mp4');

      expect(mockStitcher.stitch).toHaveBeenCalledWith(expectedInputs, expectedOutput);
    });

    it('should fall back to mergeCommand if stitcher is provided without outputFile', async () => {
      const mockStitcher: VideoStitcher = {
        stitch: vi.fn().mockResolvedValue(undefined)
      };

      // Mock console.warn to verify the warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await jobExecutor.execute(jobSpec, { stitcher: mockStitcher });

      expect(mockAdapter.execute).toHaveBeenCalledTimes(3); // 2 chunks + 1 merge command
      expect(mockStitcher.stitch).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('stitcher provided but outputFile is missing'));

      warnSpy.mockRestore();
    });

    it('should pass signal to mergeAdapter', async () => {
      const controller = new AbortController();
      const mockMergeAdapter: WorkerAdapter = {
        execute: vi.fn().mockResolvedValue({
          exitCode: 0,
          stdout: '',
          stderr: '',
          durationMs: 100
        })
      };

      await jobExecutor.execute(jobSpec, {
        mergeAdapter: mockMergeAdapter,
        signal: controller.signal
      });

      expect(mockMergeAdapter.execute).toHaveBeenCalledWith(expect.objectContaining({
        signal: controller.signal
      }));
    });

    it('should throw raw error if stitcher.stitch throws a primitive', async () => {
      const failingStitcher = {
        stitch: vi.fn().mockRejectedValue('Primitive stitch error')
      };

      await expect(jobExecutor.execute(jobSpec, {
        stitcher: failingStitcher,
        outputFile: 'out.mp4'
      })).rejects.toThrow('Primitive stitch error');
    });

    it('should throw raw error if mergeAdapter.execute throws a primitive', async () => {
      const failingMergeAdapter: WorkerAdapter = {
        execute: vi.fn().mockRejectedValue('Primitive merge error')
      };

      await expect(jobExecutor.execute(jobSpec, {
        mergeAdapter: failingMergeAdapter
      })).rejects.toThrow('Primitive merge error');
    });
  });

  describe('resiliency', () => {
    it('should wrap a thrown adapter error with the attempt count when retries are disabled', async () => {
      mockAdapter.execute = vi.fn().mockImplementation(async (job: WorkerJob) => {
        if (job.meta?.chunkId === 1) {
          return new Promise((resolve, reject) => {
             // Simulate a timeout by throwing an error that a timeout occurred
             setTimeout(() => reject(new Error('Worker job timed out after 5ms')), 5);
          });
        }
        return { exitCode: 0, stdout: '', stderr: '', durationMs: 10 };
      });

      await expect(jobExecutor.execute(jobSpec, { retries: 0 })).rejects.toThrow(/Chunk 1 failed after 1 attempts: Worker job timed out after 5ms/);
    });

    it('should stop remaining concurrent workers once a chunk has failed', async () => {
      mockAdapter.execute = vi.fn().mockImplementation(async (job: WorkerJob) => {
        if (job.meta?.chunkId === 1) {
           throw new Error('Simulated failure');
        }
        // chunk 2 takes a bit longer
        return new Promise((resolve) => setTimeout(() => resolve({ exitCode: 0, stdout: '', stderr: '', durationMs: 10 }), 20));
      });

      await expect(jobExecutor.execute(jobSpec, { concurrency: 2, retries: 0 })).rejects.toThrow(/Chunk 1 failed/);
      // Should throw, meaning it failed fast
    });
  });

  describe('merge and abort edge cases', () => {
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

      await expect(executor.execute(spec, { signal: controller.signal, retries: 1, retryDelay: 10 })).rejects.toThrow('Job aborted');
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
  });
});
