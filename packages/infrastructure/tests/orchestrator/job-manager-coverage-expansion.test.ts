import { describe, it, expect, vi } from 'vitest';
import { JobManager } from '../../src/orchestrator/job-manager.js';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { JobRepository, JobStatus } from '../../src/types/job-status.js';
import { ArtifactStorage } from '../../src/types/storage.js';
import { JobSpec } from '../../src/types/job-spec.js';

describe('JobManager Coverage Expansion', () => {
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

    // submitJob launches runJob asynchronously without awaiting it. To ensure executor.execute
    // is called, we can await submitJob, but it doesn't await runJob.
    // Instead of doing a flaky timeout, we can directly invoke runJob by making it public
    // for tests or using type casting.
    await (manager as any).runJob('job-1', spec);

    expect(onChunkCompleteCallback).toBeDefined();

    await onChunkCompleteCallback(1, { durationMs: 1500, stdout: 'ok', stderr: '' });

    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      metrics: { totalDurationMs: 1500 },
      logs: [{ chunkId: 1, durationMs: 1500, stdout: 'ok', stderr: '' }]
    }));
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
});