import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobManager } from '../../src/orchestrator/job-manager.js';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { InMemoryJobRepository } from '../../src/types/job-status.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { WorkerAdapter } from '../../src/types/adapter.js';

// Mock WorkerAdapter
const mockAdapter: WorkerAdapter = {
  execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
};

describe('JobManager', () => {
  let jobManager: JobManager;
  let repository: InMemoryJobRepository;
  let executor: JobExecutor;
  let mockExecutorExecute: any;

  const sampleJobSpec: JobSpec = {
    id: 'test-job',
    metadata: {
      totalFrames: 100,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 3.33,
    },
    chunks: [
      { id: 1, startFrame: 0, frameCount: 50, outputFile: 'out1.mp4', command: 'render 1' },
      { id: 2, startFrame: 50, frameCount: 50, outputFile: 'out2.mp4', command: 'render 2' },
    ],
    mergeCommand: 'merge',
  };

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    executor = new JobExecutor(mockAdapter);

    // Spy on executor.execute to control its behavior
    mockExecutorExecute = vi.spyOn(executor, 'execute').mockResolvedValue(undefined);

    jobManager = new JobManager(repository, executor);
  });

  it('should submit a job and return an ID', async () => {
    const id = await jobManager.submitJob(sampleJobSpec);
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('should store the initial pending state', async () => {
    const saveSpy = vi.spyOn(repository, 'save');

    // Temporarily slow down runJob to ensure we can catch the pending state
    // Or just spy on save to see that pending was saved first.

    const id = await jobManager.submitJob(sampleJobSpec);

    // The first call to save should be with 'pending' state
    expect(saveSpy).toHaveBeenCalledTimes(2); // pending, then running

    const firstCallArgs = saveSpy.mock.calls[0][0];
    expect(firstCallArgs.state).toBe('pending');
    expect(firstCallArgs.totalChunks).toBe(2);
    expect(firstCallArgs.progress).toBe(0);

    const secondCallArgs = saveSpy.mock.calls[1][0];
    expect(secondCallArgs.state).toBe('running');
  });

  it('should transition to running and then completed on success', async () => {
    // We need to wait for the async execution to complete
    // Since runJob is not awaited in submitJob, we can't await submitJob.
    // However, we can await the mocked executor call if we expose a way,
    // or we can just wait for the promise chain to settle.

    const id = await jobManager.submitJob(sampleJobSpec);

    // Allow the microtask queue to process the async runJob
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockExecutorExecute).toHaveBeenCalledWith(sampleJobSpec, expect.objectContaining({ onProgress: expect.any(Function) }));

    const job = await jobManager.getJob(id);
    expect(job?.state).toBe('completed');
    expect(job?.progress).toBe(100);
    expect(job?.completedChunks).toBe(2);
  });

  it('should aggregate metrics and logs via onChunkComplete', async () => {
    mockExecutorExecute = vi.spyOn(executor, 'execute').mockImplementation(async (spec, options) => {
      if (options?.onChunkComplete) {
        await options.onChunkComplete(1, { exitCode: 0, stdout: 'chunk 1 out', stderr: '', durationMs: 150 });
        await options.onChunkComplete(2, { exitCode: 0, stdout: 'chunk 2 out', stderr: '', durationMs: 200 });
      }
    });

    const id = await jobManager.submitJob(sampleJobSpec);

    await new Promise(resolve => setTimeout(resolve, 50));

    const job = await jobManager.getJob(id);
    expect(job?.metrics).toBeDefined();
    expect(job?.metrics?.totalDurationMs).toBe(350);
    expect(job?.logs).toBeDefined();
    expect(job?.logs?.length).toBe(2);
    expect(job?.logs?.[0]).toMatchObject({ chunkId: 1, durationMs: 150, stdout: 'chunk 1 out' });
    expect(job?.logs?.[1]).toMatchObject({ chunkId: 2, durationMs: 200, stdout: 'chunk 2 out' });
  });

  it('should transition to failed on execution error', async () => {
    mockExecutorExecute.mockRejectedValue(new Error('Execution failed'));

    const id = await jobManager.submitJob(sampleJobSpec);

    // Allow async execution
    await new Promise(resolve => setTimeout(resolve, 50));

    const job = await jobManager.getJob(id);
    expect(job?.state).toBe('failed');
    expect(job?.error).toBe('Execution failed');
  });

  it('should list all jobs from repository', async () => {
    await jobManager.submitJob(sampleJobSpec);
    await jobManager.submitJob(sampleJobSpec);

    const jobs = await repository.list();
    expect(jobs.length).toBe(2);
  });

  it('should successfully pause a running job', async () => {
    mockExecutorExecute.mockImplementation(async (spec: any, options: any) => {
      // simulate long running job
      return new Promise((resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const id = await jobManager.submitJob(sampleJobSpec);
    await new Promise(resolve => setTimeout(resolve, 50));

    let job = await jobManager.getJob(id);
    expect(job?.state).toBe('running');

    await jobManager.pauseJob(id);
    await new Promise(resolve => setTimeout(resolve, 50));

    job = await jobManager.getJob(id);
    expect(job?.state).toBe('paused');
  });

  it('should successfully resume a paused job and skip completed chunks', async () => {
    mockExecutorExecute.mockResolvedValue(undefined);

    const id = await jobManager.submitJob(sampleJobSpec);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Manually set to paused and add completed chunks to logs
    let job = await jobManager.getJob(id);
    if (job) {
      job.state = 'paused';
      job.logs = [
        { chunkId: 1, durationMs: 150, stdout: '', stderr: '' }
      ];
      await repository.save(job);
    }

    await jobManager.resumeJob(id, { concurrency: 2 });
    await new Promise(resolve => setTimeout(resolve, 50));

    job = await jobManager.getJob(id);
    expect(job?.state).toBe('completed');

    // We expect execute to have been called again with the updated options
    expect(mockExecutorExecute).toHaveBeenCalledWith(sampleJobSpec, expect.objectContaining({
      concurrency: 2,
      completedChunkIds: [1]
    }));
  });
});
