import { describe, it, expect, vi } from 'vitest';
import { JobManager } from '../../src/orchestrator/job-manager.js';
import { JobRepository, JobStatus } from '../../src/types/job-status.js';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { ArtifactStorage } from '../../src/types/storage.js';

describe('JobManager Coverage Expansion', () => {
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

  it('should log unhandled error during submitJob background execution', async () => {
    const mockRepo: JobRepository = {
      save: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      delete: vi.fn()
    };
    const mockExecutor = {} as JobExecutor;
    const manager = new JobManager(mockRepo, mockExecutor);

    // Mock internal runJob to throw
    (manager as any).runJob = vi.fn().mockRejectedValue(new Error('Submit error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await manager.submitJob({ chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' });

    // Allow promise to reject in background
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unhandled error in job'), expect.any(Error));
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

  it('should skip setting options.meta if not passed', async () => {
    const mockRepo: JobRepository = {
      save: vi.fn(),
      get: vi.fn().mockResolvedValue({
        id: 'job-1',
        state: 'running',
        spec: { chunks: [] },
        completedChunks: 0,
        totalChunks: 1
      } as unknown as JobStatus),
      list: vi.fn(),
      delete: vi.fn()
    };

    const mockExecutor: JobExecutor = {
      execute: vi.fn().mockResolvedValue(undefined)
    } as unknown as JobExecutor;

    const mockStorage: ArtifactStorage = {
      uploadAssetBundle: vi.fn().mockResolvedValue('http://assets'),
      uploadJobSpec: vi.fn().mockResolvedValue('http://spec'),
      deleteAssetBundle: vi.fn(),
      deleteJobSpec: vi.fn(),
      downloadAssetBundle: vi.fn(),
      downloadJobSpec: vi.fn()
    };

    const manager = new JobManager(mockRepo, mockExecutor, mockStorage);
    const spec: JobSpec = { id: 'job-1', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '', assetsUrl: 'local/assets' };

    // Pass undefined options to trigger the !options.meta and !job.meta branches (179-185)
    const options: any = { jobDir: '/tmp' };
    await (manager as any).runJob('job-1', spec, options);

    expect(mockStorage.uploadJobSpec).toHaveBeenCalled();
    expect(options.meta).toBeDefined();
    expect(options.meta.jobDefUrl).toEqual('http://spec');
  });

  it('should execute controller abort if it exists during pauseJob', async () => {
    const mockRepo: JobRepository = {
      save: vi.fn(),
      get: vi.fn().mockResolvedValue({
        id: 'job-1',
        state: 'running',
        spec: { chunks: [] },
        completedChunks: 0,
        totalChunks: 1
      } as unknown as JobStatus),
      list: vi.fn(),
      delete: vi.fn()
    };
    const mockExecutor = {} as JobExecutor;
    const manager = new JobManager(mockRepo, mockExecutor);

    // Mock controller map
    const controller = new AbortController();
    vi.spyOn(controller, 'abort');
    (manager as any).controllers.set('job-1', controller);

    await manager.pauseJob('job-1');

    expect(controller.abort).toHaveBeenCalled();
  });

  it('should handle optional options.meta appropriately during job start storage setup', async () => {
    const mockRepo: JobRepository = {
      save: vi.fn(),
      get: vi.fn().mockImplementation((id) => {
        if (id === 'job-1') {
          return Promise.resolve({
            id: 'job-1',
            state: 'running',
            spec: { chunks: [] },
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
      execute: vi.fn().mockResolvedValue(undefined)
    } as unknown as JobExecutor;

    const mockStorage: ArtifactStorage = {
      uploadAssetBundle: vi.fn().mockResolvedValue('http://assets'),
      uploadJobSpec: vi.fn().mockResolvedValue('http://spec'),
      deleteAssetBundle: vi.fn(),
      deleteJobSpec: vi.fn(),
      downloadAssetBundle: vi.fn(),
      downloadJobSpec: vi.fn()
    };

    const manager = new JobManager(mockRepo, mockExecutor, mockStorage);
    const spec: JobSpec = { id: 'job-1', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '', assetsUrl: 'local/assets' };

    // Pass undefined options to trigger the !options.meta and !job.meta branches (179-185)
    // We also need options.jobDir to be truthy to enter the block.
    await (manager as any).runJob('job-1', spec, { jobDir: '/tmp' });

    expect(mockStorage.uploadJobSpec).toHaveBeenCalled();
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
