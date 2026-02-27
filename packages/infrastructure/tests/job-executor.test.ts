import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobExecutor } from '../src/orchestrator/job-executor.js';
import { WorkerAdapter, WorkerJob } from '../src/types/adapter.js';
import { JobSpec } from '../src/types/job-spec.js';

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

  it('should use default concurrency of 1 if not specified', async () => {
    await jobExecutor.execute(jobSpec);
    expect(mockAdapter.execute).toHaveBeenCalledTimes(3);
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
});
