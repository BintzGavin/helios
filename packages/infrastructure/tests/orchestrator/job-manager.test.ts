import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobManager } from '../../src/orchestrator/job-manager.js';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { InMemoryJobRepository, JobRepository, JobStatus, JobState } from '../../src/types/job-status.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { WorkerAdapter } from '../../src/types/adapter.js';
import { ArtifactStorage } from '../../src/types/storage.js';

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

  it('should submit a job, return an ID and store the initial pending state', async () => {
    const saveSpy = vi.spyOn(repository, 'save');

    const id = await jobManager.submitJob(sampleJobSpec);

    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    // The first call to save should be with 'pending' state
    expect(saveSpy).toHaveBeenCalledTimes(2); // pending, then running

    const firstCallArgs = saveSpy.mock.calls[0][0];
    expect(firstCallArgs.id).toBe(id);
    expect(firstCallArgs.state).toBe('pending');
    expect(firstCallArgs.totalChunks).toBe(2);
    expect(firstCallArgs.progress).toBe(0);
    expect(firstCallArgs.completedChunks).toBe(0);

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

  it('getJob should return undefined for non-existent job', async () => {
    const job = await jobManager.getJob('non-existent-id');
    expect(job).toBeUndefined();
  });

  it('should update job status progressively via onProgress callback', async () => {
    // Mock the executor to call the onProgress callback incrementally
    mockExecutorExecute.mockImplementation(async (spec: any, options: any) => {
      if (options?.onProgress) {
        await options.onProgress(1, 2);
        // Add a small delay so we can inspect the state midway
        await new Promise(resolve => setTimeout(resolve, 20));
        await options.onProgress(2, 2);
      }
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);

    // Give it a tiny moment to transition to running and process first progress
    await new Promise(resolve => setTimeout(resolve, 10));

    let job = await jobManager.getJob(jobId);
    expect(job?.state).toBe('running' as JobState);
    expect(job?.completedChunks).toBe(1);
    expect(job?.progress).toBe(50);

    // Wait for the full execution to complete
    await new Promise(resolve => setTimeout(resolve, 30));

    job = await jobManager.getJob(jobId);
    expect(job?.state).toBe('completed' as JobState);
    expect(job?.completedChunks).toBe(2);
    expect(job?.progress).toBe(100);
  });

  it('listJobs should return all jobs from the repository', async () => {
    await jobManager.submitJob(sampleJobSpec);
    await jobManager.submitJob(sampleJobSpec);

    const jobs = await jobManager.listJobs();
    expect(jobs).toHaveLength(2);
  });

  it('should aggregate metrics and logs via onChunkComplete', async () => {
    mockExecutorExecute.mockImplementation(async (spec: any, options: any) => {
      if (options?.onChunkComplete) {
        await options.onChunkComplete(1, { exitCode: 0, stdout: 'chunk 1 out', stderr: '', durationMs: 150 });
        // Add a small delay
        await new Promise(resolve => setTimeout(resolve, 20));
        await options.onChunkComplete(2, { exitCode: 0, stdout: 'chunk 2 out', stderr: '', durationMs: 200 });
      }
    });

    const id = await jobManager.submitJob(sampleJobSpec);

    // Wait for the full execution to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    const job = await jobManager.getJob(id);
    expect(job?.state).toBe('completed' as JobState);
    expect(job?.metrics?.totalDurationMs).toBe(350);
    expect(job?.logs).toBeDefined();
    expect(job?.logs).toHaveLength(2);
    expect(job?.logs![0]).toEqual({
      chunkId: 1,
      durationMs: 150,
      stdout: 'chunk 1 out',
      stderr: ''
    });
    expect(job?.logs![1]).toEqual({
      chunkId: 2,
      durationMs: 200,
      stdout: 'chunk 2 out',
      stderr: ''
    });
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

  it('should reject submitJob if the repository fails during save', async () => {
    // Mock the repository to throw an error
    const errorMsg = 'Database connection failed';
    vi.spyOn(repository, 'save').mockRejectedValue(new Error(errorMsg));

    // Expected to reject with the error thrown by save
    await expect(jobManager.submitJob(sampleJobSpec)).rejects.toThrow(errorMsg);
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

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled error in job'), expect.any(Error));

    consoleErrorSpy.mockRestore();
    submitSpy.mockRestore();
  });

  it('cancelJob should abort the executor and set state to cancelled', async () => {
    let executeResolve: () => void;

    // Simulate long running executor that can be aborted
    mockExecutorExecute.mockImplementation((spec: any, options: any) => {
      return new Promise<void>((resolve, reject) => {
        executeResolve = resolve;
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const error = new Error('Job aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }
      });
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);

    // Give it a tiny moment to transition to running
    await new Promise(resolve => setTimeout(resolve, 10));

    let job = await jobManager.getJob(jobId);
    expect(job?.state).toBe('running' as JobState);

    // Cancel the job
    await jobManager.cancelJob(jobId);

    // Give it time to catch the AbortError and update state
    await new Promise(resolve => setTimeout(resolve, 20));

    job = await jobManager.getJob(jobId);
    expect(job?.state).toBe('cancelled' as JobState);

    // Ensure we don't leave lingering promises
    executeResolve!();
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

  it('should delete a job and cancel it if it is running', async () => {
    let executeResolve: () => void;
    mockExecutorExecute.mockImplementation((spec: any, options: any) => {
      return new Promise<void>((resolve, reject) => {
        executeResolve = resolve;
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const error = new Error('Job aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }
      });
    });

    const jobId = await jobManager.submitJob(sampleJobSpec);

    // Give it a tiny moment to transition to running
    await new Promise(resolve => setTimeout(resolve, 10));

    let job = await jobManager.getJob(jobId);
    expect(job?.state).toBe('running' as JobState);

    // Delete the job
    await jobManager.deleteJob(jobId);

    // Give it time to catch the AbortError
    await new Promise(resolve => setTimeout(resolve, 20));

    job = await jobManager.getJob(jobId);
    expect(job).toBeUndefined();

    const jobs = await jobManager.listJobs();
    expect(jobs).toHaveLength(0);

    executeResolve!();
  });

  it('should delete job assets if storage and assetsUrl are present', async () => {
    // Setup mock storage
    const mockStorage = {
      uploadAssetBundle: vi.fn(),
      downloadAssetBundle: vi.fn(),
      deleteAssetBundle: vi.fn().mockResolvedValue(undefined),
      uploadJobSpec: vi.fn(),
      deleteJobSpec: vi.fn()
    };

    const jobManagerWithStorage = new JobManager(repository, executor, mockStorage);

    // Create a job with assetsUrl directly
    const specWithAssets = { ...sampleJobSpec, assetsUrl: 'local://some/dir' };

    const jobId = await jobManagerWithStorage.submitJob(specWithAssets);

    // Wait for internal updates to finish
    await new Promise(resolve => setTimeout(resolve, 20));

    // Ensure job is saved and complete
    const job = await jobManagerWithStorage.getJob(jobId);
    expect(job).toBeDefined();

    // Delete the job
    await jobManagerWithStorage.deleteJob(jobId);

    // Wait for deletion and potential storage call
    await new Promise(resolve => setTimeout(resolve, 20));

    // Verify it was deleted from repo
    const deletedJob = await jobManagerWithStorage.getJob(jobId);
    expect(deletedJob).toBeUndefined();

    // Verify storage cleanup was called
    expect(mockStorage.deleteAssetBundle).toHaveBeenCalledWith(jobId, 'local://some/dir');
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
    expect(job?.meta?.jobDefUrl).toBe('s3://test-bucket/job.json');
    expect(mockStorage.uploadJobSpec).toHaveBeenCalledWith(id, expect.objectContaining({ assetsUrl: 's3://test-bucket/assets' }));

    // Verify the modified spec with assetsUrl was passed to executor, along with the
    // jobDefUrl in meta (options.meta is created on demand when not passed in)
    expect(mockExecutorExecute).toHaveBeenCalledWith(
      expect.objectContaining({ assetsUrl: 's3://test-bucket/assets' }),
      expect.objectContaining({ meta: expect.objectContaining({ jobDefUrl: 's3://test-bucket/job.json' }) })
    );
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

  it('should transition to failed if job spec upload fails', async () => {
    const errorMsg = 'S3 JobSpec Upload Failed';
    const mockStorage = {
      uploadAssetBundle: vi.fn().mockResolvedValue('s3://test/assets'),
      downloadAssetBundle: vi.fn(),
      deleteAssetBundle: vi.fn(),
      uploadJobSpec: vi.fn().mockRejectedValue(new Error(errorMsg)),
      deleteJobSpec: vi.fn()
    };

    const jobManagerWithStorage = new JobManager(repository, executor, mockStorage);

    // Deep clone the job spec to avoid mutating the sample (assetsUrl is set before the spec upload)
    const localSpec = JSON.parse(JSON.stringify(sampleJobSpec));

    // submitJob does not await the job execution, so it should not throw
    const jobId = await jobManagerWithStorage.submitJob(localSpec, { jobDir: '/tmp/test' });

    // Wait for the background process to update the job state
    await vi.waitFor(async () => {
      const job = await jobManagerWithStorage.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.state).toBe('failed');
      expect(job?.error).toContain(errorMsg);
    });
  });

  describe('edge cases with a mocked repository', () => {
    it('should initialize metrics and logs arrays if undefined in onChunkComplete', async () => {
      let onChunkCompleteCallback: any;

      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockImplementation((id) => {
          if (id === 'job-1') {
            return Promise.resolve({
              id: 'job-1',
              state: 'running',
              spec: { chunks: [{id: 1, command: 'cmd', startFrame: 0, frameCount: 10, outputFile: 'out.mp4'}] },
              metrics: undefined,
              logs: undefined,
              completedChunks: 0,
              totalChunks: 1
            } as unknown as JobStatus);
          }
          return Promise.resolve(undefined);
        }),
        list: vi.fn(),
        delete: vi.fn()
      };

      const mockExecutor: JobExecutor = {
        execute: vi.fn().mockImplementation(async (spec, options) => {
          onChunkCompleteCallback = options.onChunkComplete;
        })
      } as unknown as JobExecutor;

      const manager = new JobManager(mockRepo, mockExecutor);

      const spec: JobSpec = { id: 'job-1', chunks: [{id: 1, command: 'cmd', startFrame: 0, frameCount: 10, outputFile: 'out.mp4'}], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

      await (manager as any).runJob('job-1', spec);

      expect(onChunkCompleteCallback).toBeDefined();

      await onChunkCompleteCallback(1, { durationMs: 1500, stdout: 'ok', stderr: '' });

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        metrics: { totalDurationMs: 1500 },
        logs: [{ chunkId: 1, durationMs: 1500, stdout: 'ok', stderr: '' }]
      }));
    });

    it('should not throw if repository.get returns undefined during onProgress', async () => {
      let onProgressCallback: any;

      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockImplementation((id) => {
          if (id === 'job-1') {
            return Promise.resolve({
              id: 'job-1',
              state: 'running',
              spec: { chunks: [{id: 1, command: 'cmd', startFrame: 0, frameCount: 10, outputFile: 'out.mp4'}] },
              completedChunks: 0,
              totalChunks: 1
            } as unknown as JobStatus);
          }
          return Promise.resolve(undefined);
        }),
        list: vi.fn(),
        delete: vi.fn()
      };

      const mockExecutor: JobExecutor = {
        execute: vi.fn().mockImplementation(async (spec, options) => {
          onProgressCallback = options.onProgress;
        })
      } as unknown as JobExecutor;

      const manager = new JobManager(mockRepo, mockExecutor);
      const spec: JobSpec = { id: 'job-1', chunks: [{id: 1, command: 'cmd', startFrame: 0, frameCount: 10, outputFile: 'out.mp4'}], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

      await (manager as any).runJob('job-1', spec);
      expect(onProgressCallback).toBeDefined();

      // Clear mock repo tracking and mock get to return undefined for the callback
      (mockRepo.save as any).mockClear();
      mockRepo.get = vi.fn().mockResolvedValue(undefined);

      await expect(onProgressCallback(1, 1)).resolves.not.toThrow();
      // Save should not have been called inside onProgress
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should not throw if repository.get returns undefined during onChunkComplete', async () => {
      let onChunkCompleteCallback: any;

      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockImplementation((id) => {
          if (id === 'job-1') {
            return Promise.resolve({
              id: 'job-1',
              state: 'running',
              spec: { chunks: [{id: 1, command: 'cmd', startFrame: 0, frameCount: 10, outputFile: 'out.mp4'}] },
              completedChunks: 0,
              totalChunks: 1
            } as unknown as JobStatus);
          }
          return Promise.resolve(undefined);
        }),
        list: vi.fn(),
        delete: vi.fn()
      };

      const mockExecutor: JobExecutor = {
        execute: vi.fn().mockImplementation(async (spec, options) => {
          onChunkCompleteCallback = options.onChunkComplete;
        })
      } as unknown as JobExecutor;

      const manager = new JobManager(mockRepo, mockExecutor);
      const spec: JobSpec = { id: 'job-1', chunks: [{id: 1, command: 'cmd', startFrame: 0, frameCount: 10, outputFile: 'out.mp4'}], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

      await (manager as any).runJob('job-1', spec);
      expect(onChunkCompleteCallback).toBeDefined();

      // Clear mock repo tracking and mock get to return undefined for the callback
      (mockRepo.save as any).mockClear();
      mockRepo.get = vi.fn().mockResolvedValue(undefined);

      await expect(onChunkCompleteCallback(1, { durationMs: 1500, stdout: 'ok', stderr: '' })).resolves.not.toThrow();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should exit early in resumeJob if job is not found or not paused', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue(undefined),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const manager = new JobManager(mockRepo, mockExecutor);

      // Should not throw or do anything
      await expect(manager.resumeJob('job-1')).resolves.not.toThrow();

      // Now test with a job that is not paused
      mockRepo.get = vi.fn().mockResolvedValue({ state: 'running' } as unknown as JobStatus);
      await expect(manager.resumeJob('job-1')).resolves.not.toThrow();
    });

    it('should catch and log error in resumeJob if runJob throws', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue({
          id: 'job-1',
          state: 'paused',
          spec: { chunks: [] }
        } as unknown as JobStatus),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const manager = new JobManager(mockRepo, mockExecutor);

      // Mock internal runJob to throw
      (manager as any).runJob = vi.fn().mockRejectedValue(new Error('Run error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await manager.resumeJob('job-1');

      // Due to the unhandled promise catch we need to wait a tick
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('Unhandled error resuming job job-1:', expect.any(Error));
    });

    it('should exit early in deleteJob if job is not found', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue(undefined),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const manager = new JobManager(mockRepo, mockExecutor);

      await expect(manager.deleteJob('job-1')).resolves.not.toThrow();
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('should catch and log error during remote asset bundle deletion in deleteJob', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue({
          id: 'job-1',
          state: 'completed',
          spec: { chunks: [], assetsUrl: 'http://example.com/assets.zip' },
          meta: {}
        } as unknown as JobStatus),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const mockStorage: ArtifactStorage = {
        uploadAssetBundle: vi.fn(),
        uploadJobSpec: vi.fn(),
        deleteAssetBundle: vi.fn().mockRejectedValue(new Error('Asset delete error')),
        deleteJobSpec: vi.fn(),
        downloadAssetBundle: vi.fn(),
        downloadJobSpec: vi.fn()
      };

      const manager = new JobManager(mockRepo, mockExecutor, mockStorage);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await manager.deleteJob('job-1');

      expect(console.error).toHaveBeenCalledWith('Failed to delete assets for job job-1:', expect.any(Error));
    });

    it('should catch and log error during remote job spec deletion in deleteJob', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue({
          id: 'job-1',
          state: 'completed',
          spec: { chunks: [] },
          meta: { jobDefUrl: 'http://example.com/spec.json' }
        } as unknown as JobStatus),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const mockStorage: ArtifactStorage = {
        uploadAssetBundle: vi.fn(),
        uploadJobSpec: vi.fn(),
        deleteAssetBundle: vi.fn(),
        deleteJobSpec: vi.fn().mockRejectedValue(new Error('Spec delete error')),
        downloadAssetBundle: vi.fn(),
        downloadJobSpec: vi.fn()
      };

      const manager = new JobManager(mockRepo, mockExecutor, mockStorage);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await manager.deleteJob('job-1');

      expect(console.error).toHaveBeenCalledWith('Failed to delete job spec for job job-1:', expect.any(Error));
    });

    it('should exit early in cancelJob if job is not found or not pending/running', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue(undefined),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const manager = new JobManager(mockRepo, mockExecutor);

      await expect(manager.cancelJob('job-1')).resolves.not.toThrow();

      // Now test with a job that is not pending/running
      mockRepo.get = vi.fn().mockResolvedValue({ state: 'completed' } as unknown as JobStatus);
      await expect(manager.cancelJob('job-1')).resolves.not.toThrow();
    });

    it('should explicitly save cancelled state if cancelJob is called but no AbortController exists', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue({ state: 'pending' } as unknown as JobStatus),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const manager = new JobManager(mockRepo, mockExecutor);

      await manager.cancelJob('job-1');

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ state: 'cancelled' }));
    });

    it('should exit early in pauseJob if job is not found or not running', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue(undefined),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const manager = new JobManager(mockRepo, mockExecutor);

      await expect(manager.pauseJob('job-1')).resolves.not.toThrow();

      // Now test with a job that is not running
      mockRepo.get = vi.fn().mockResolvedValue({ state: 'completed' } as unknown as JobStatus);
      await expect(manager.pauseJob('job-1')).resolves.not.toThrow();
    });

    it('should exit early in runJob if job is not found', async () => {
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockResolvedValue(undefined),
        list: vi.fn(),
        delete: vi.fn()
      };
      const mockExecutor = {} as JobExecutor;
      const manager = new JobManager(mockRepo, mockExecutor);

      // We expect this to resolve immediately because runJob returns if !job (line 166)
      await expect((manager as any).runJob('job-1', {} as JobSpec)).resolves.toBeUndefined();
    });

    it('should skip job completion state transition if job is undefined from repository after execute', async () => {
      let callCount = 0;
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockImplementation((id) => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              id: 'job-1',
              state: 'running',
              spec: { chunks: [] },
              completedChunks: 0,
              totalChunks: 1
            } as unknown as JobStatus);
          }
          // Return undefined after execution
          return Promise.resolve(undefined);
        }),
        list: vi.fn(),
        delete: vi.fn()
      };

      const mockExecutor: JobExecutor = {
        execute: vi.fn().mockResolvedValue(undefined)
      } as unknown as JobExecutor;

      const manager = new JobManager(mockRepo, mockExecutor);
      const spec: JobSpec = { id: 'job-1', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

      await (manager as any).runJob('job-1', spec);

      // save should only be called once initially when state changes to running
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should skip job error state transition if job is undefined from repository after execute error', async () => {
      let callCount = 0;
      const mockRepo: JobRepository = {
        save: vi.fn(),
        get: vi.fn().mockImplementation((id) => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              id: 'job-1',
              state: 'running',
              spec: { chunks: [] },
              completedChunks: 0,
              totalChunks: 1
            } as unknown as JobStatus);
          }
          // Return undefined in catch block
          return Promise.resolve(undefined);
        }),
        list: vi.fn(),
        delete: vi.fn()
      };

      const mockExecutor: JobExecutor = {
        execute: vi.fn().mockRejectedValue(new Error('Test error'))
      } as unknown as JobExecutor;

      const manager = new JobManager(mockRepo, mockExecutor);
      const spec: JobSpec = { id: 'job-1', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // runJob swallows errors from execute and catches them, it doesn't throw. We need to await it and check the result.
      await (manager as any).runJob('job-1', spec);

      // save should only be called once initially when state changes to running
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
