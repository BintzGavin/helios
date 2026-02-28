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
});
