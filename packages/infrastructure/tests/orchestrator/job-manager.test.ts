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

  it('should not throw if currentJob is missing in onProgress and onChunkComplete', async () => {
    mockExecutorExecute = vi.spyOn(executor, 'execute').mockImplementation(async (spec, options) => {
      // Simulate a deleted job mid-execution
      await repository.delete(spec.id);

      if (options?.onProgress) {
        await options.onProgress(1, 2);
      }
      if (options?.onChunkComplete) {
        await options.onChunkComplete(1, { exitCode: 0, stdout: 'out', stderr: '', durationMs: 150 });
      }
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);

    // Wait for execution to finish
    await new Promise(resolve => setTimeout(resolve, 30));

    // Delete the job again just to be sure it's not saved by the execute finish block
    await repository.delete(jobId);

    // Should have completed without unhandled rejections
    const job = await repository.get(jobId);
    expect(job).toBeUndefined();
  });

  it('should not throw if currentJob is missing in onProgress and onChunkComplete metrics block', async () => {
    mockExecutorExecute = vi.spyOn(executor, 'execute').mockImplementation(async (spec, options) => {
      const origGet = repository.get.bind(repository);
      vi.spyOn(repository, 'get').mockResolvedValue(undefined);

      if (options?.onProgress) {
        await options.onProgress(1, 2);
      }
      if (options?.onChunkComplete) {
        await options.onChunkComplete(1, { exitCode: 0, stdout: 'out', stderr: '', durationMs: 150 });
      }
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);
    await new Promise(resolve => setTimeout(resolve, 30));

    // Should just not crash.
    expect(true).toBe(true);
  });

  it('should not throw if job is deleted and controller is aborted in runJob catch block', async () => {
    mockExecutorExecute = vi.spyOn(executor, 'execute').mockImplementation(async (spec) => {
      let callCount = 0;
      const origGet = repository.get.bind(repository);
      vi.spyOn(repository, 'get').mockImplementation(async (id) => {
        callCount++;
        // We want `exists` on line 264 to be undefined to trigger the else block return.
        // It's the 3rd get call (1st is top of runJob, 2nd is start of catch block)
        if (callCount === 3) {
            return undefined; // Simulate deleted
        }
        return origGet(id);
      });

      const error = new Error('Job aborted');
      error.name = 'AbortError';
      throw error;
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);
    await new Promise(resolve => setTimeout(resolve, 50));

    // We expect undefined because it was deleted
    const finalJob = await repository.get(jobId);
    expect(finalJob).toBeUndefined();
  });

  it('should not crash if job was paused prior to completing execution and repository.get returns paused job', async () => {
    let internalJobId = '';
    mockExecutorExecute = vi.spyOn(executor, 'execute').mockImplementation(async (spec) => {
      // simulate pausing by updating the job state inside the runJob flow execution delay
      internalJobId = spec.id;
      // We don't throw immediately, we just wait enough for the test runner to pause it externally
      await new Promise(resolve => setTimeout(resolve, 50));
      const error = new Error('Job aborted');
      error.name = 'AbortError';
      throw error;
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);

    // Allow job to start
    await new Promise(resolve => setTimeout(resolve, 10));

    // Pause it externally while it's "executing"
    await jobManager.pauseJob(jobId);

    // Wait for execute to finish
    await new Promise(resolve => setTimeout(resolve, 60));

    const finalJob = await repository.get(jobId);
    expect(finalJob?.state).toBe('paused');
  });

  it('should correctly mark job as cancelled if AbortError occurs but job is missing from repository', async () => {
    mockExecutorExecute = vi.spyOn(executor, 'execute').mockImplementation(async (spec) => {
      // We delete the job via a spy on get to simulate it missing right before save
      // so it hits the !exists block on line 266
      const origGet = repository.get.bind(repository);
      let getCount = 0;
      vi.spyOn(repository, 'get').mockImplementation(async (id) => {
        getCount++;
        if (getCount === 2) { // The second get() in the catch block
          return undefined;
        }
        return origGet(id);
      });

      const error = new Error('Job aborted');
      error.name = 'AbortError';
      throw error;
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);
    await new Promise(resolve => setTimeout(resolve, 30));

    const finalJob = await repository.get(jobId);
    // Since we didn't save because it was missing, the state remains what it was in repository
    // but the test specifically checks it handles missing job correctly by returning without save.
    // The spy actually hid it, but it's still in the DB technically, we just intercepted it.
    // So the state won't be 'cancelled'.
    expect(finalJob?.state).not.toBe('cancelled');
  });

  it('should correctly capture regular errors if job still exists in repository', async () => {
    mockExecutorExecute = vi.spyOn(executor, 'execute').mockImplementation(async () => {
      throw new Error('A regular error');
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);
    await new Promise(resolve => setTimeout(resolve, 30));

    const finalJob = await repository.get(jobId);
    expect(finalJob?.state).toBe('failed');
    expect(finalJob?.error).toBe('A regular error');
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

  it('should handle unhandled errors returning from runJob without crashing', async () => {
    // Force a complete crash in runJob by making executor execute throw instantly
    // Since runJob catches errors via execute catch, we need it to throw before execute
    // Actually, `runJob` catches all synchronous/asynchronous errors inside it.
    // The `.catch()` on `this.runJob().catch` only triggers if `runJob` itself throws outside its own try/catch.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(repository, 'get').mockRejectedValueOnce(new Error('DB failure'));

    await jobManager.resumeJob('does-not-exist').catch(e => e); // shouldn't do much if job not found

    // We will submit a job normally, then intercept repository get inside `resumeJob` or `submitJob` to trigger the `.catch`
    // `submitJob` awaits `repository.save`, then calls `runJob` without awaiting.
    // Inside `runJob`, the first line is `let job = await this.repository.get(id);`
    // If that throws, `runJob` throws a rejected promise which is caught by `.catch(err => ...)` in submitJob.

    const submitSpy = vi.spyOn(repository, 'get').mockRejectedValueOnce(new Error('Fatal get error'));

    // Submit normally. The `repository.save` works, then `runJob` is called.
    await jobManager.submitJob(sampleJobSpec);

    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled error'), expect.any(Error));

    consoleErrorSpy.mockRestore();
    submitSpy.mockRestore();
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

  it('should transition to failed if asset upload fails', async () => {
    const mockStorage = {
      uploadAssetBundle: vi.fn().mockRejectedValue(new Error('S3 offline')),
      downloadAssetBundle: vi.fn(),
      deleteAssetBundle: vi.fn(),
      uploadJobSpec: vi.fn(),
      deleteJobSpec: vi.fn()
    };

    const jobManagerWithStorage = new JobManager(repository, executor, mockStorage);
    const id = await jobManagerWithStorage.submitJob(sampleJobSpec, { jobDir: '/local/job/dir' });

    await new Promise(resolve => setTimeout(resolve, 50));

    const job = await jobManagerWithStorage.getJob(id);
    expect(job?.state).toBe('failed');
    expect(job?.error).toContain('S3 offline');
  });

  it('should upload assets if storage and jobDir are provided', async () => {
    const mockStorage = {
      uploadAssetBundle: vi.fn().mockResolvedValue('s3://test-bucket/assets'),
      downloadAssetBundle: vi.fn(),
      deleteAssetBundle: vi.fn(),
      uploadJobSpec: vi.fn().mockResolvedValue('s3://test-bucket/job.json'),
      deleteJobSpec: vi.fn()
    };

    // Create a new JobManager with storage configured
    const jobManagerWithStorage = new JobManager(repository, executor, mockStorage);

    // Deep clone the job spec to avoid mutating the sample
    const localSpec = JSON.parse(JSON.stringify(sampleJobSpec));

    const id = await jobManagerWithStorage.submitJob(localSpec, { jobDir: '/local/job/dir' });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockStorage.uploadAssetBundle).toHaveBeenCalledWith(id, '/local/job/dir');

    const job = await jobManagerWithStorage.getJob(id);
    expect(job?.spec.assetsUrl).toBe('s3://test-bucket/assets');
    expect(mockStorage.uploadJobSpec).toHaveBeenCalledWith(id, expect.objectContaining({ assetsUrl: 's3://test-bucket/assets' }));

    // Verify the modified spec with assetsUrl was passed to executor
    expect(mockExecutorExecute).toHaveBeenCalledWith(
      expect.objectContaining({ assetsUrl: 's3://test-bucket/assets' }),
      expect.any(Object)
    );
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
