import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobManager } from '../../src/orchestrator/job-manager.js';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { InMemoryJobRepository, JobStatus } from '../../src/types/job-status.js';
import { ArtifactStorage } from '../../src/types/storage.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { WorkerAdapter } from '../../src/types/adapter.js';

describe('JobManager Coverage Expansion', () => {
  let repository: InMemoryJobRepository;
  let storage: ArtifactStorage;
  let jobManager: JobManager;
  let executor: JobExecutor;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    storage = {
      uploadAssetBundle: vi.fn(),
      downloadAssetBundle: vi.fn(),
      deleteAssetBundle: vi.fn(),
      uploadJobSpec: vi.fn(),
      downloadJobSpec: vi.fn(),
      deleteJobSpec: vi.fn(),
    } as unknown as ArtifactStorage;
    const mockAdapter: WorkerAdapter = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    };
    executor = new JobExecutor(mockAdapter);
    jobManager = new JobManager(repository, executor, storage);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should log an error when deleteAssetBundle throws', async () => {
    (storage.deleteAssetBundle as any).mockRejectedValue(new Error('deleteAssetBundle failed'));
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, assetsUrl: 's3://assets', mergeCommand: '' };
    const job: JobStatus = {
        id: 'test-job',
        spec,
        state: 'pending',
        progress: 0,
        totalChunks: 0,
        completedChunks: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    await repository.save(job);
    await jobManager.deleteJob('test-job');
    expect(console.error).toHaveBeenCalledWith('Failed to delete assets for job test-job:', expect.any(Error));
  });

  it('should log an error when deleteJobSpec throws', async () => {
    (storage.deleteJobSpec as any).mockRejectedValue(new Error('deleteJobSpec failed'));
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
    const job: JobStatus = {
        id: 'test-job',
        spec,
        state: 'pending',
        progress: 0,
        totalChunks: 0,
        completedChunks: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        meta: { jobDefUrl: 's3://spec' }
    };
    await repository.save(job);
    await jobManager.deleteJob('test-job');
    expect(console.error).toHaveBeenCalledWith('Failed to delete job spec for job test-job:', expect.any(Error));
  });

  it('should initialize metrics and logs if undefined during onChunkComplete', async () => {
    const spec: JobSpec = { id: 'test-job', chunks: [{ id: 1, startFrame: 0, frameCount: 10, outputFile: 'out.mp4', command: 'cmd' }], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
    const jobId = await jobManager.submitJob(spec, { adapter: { execute: vi.fn() } as any });

    const job = await repository.get(jobId);
    if (job) {
        delete job.metrics;
        delete job.logs;
        await repository.save(job);
    }

    const executorExecute = vi.spyOn(JobExecutor.prototype, 'execute').mockImplementation(async (jobSpec, options) => {
        if (options?.onChunkComplete) {
            await options.onChunkComplete(1, { durationMs: 100, stdout: 'out', stderr: 'err', exitCode: 0 });
        }
    });

    const originalRunJob = (jobManager as any).runJob;
    await originalRunJob.call(jobManager, jobId, spec, { adapter: { execute: vi.fn() } as any });

    const updatedJob = await repository.get(jobId);
    expect(updatedJob?.metrics).toBeDefined();
    expect(updatedJob?.metrics?.totalDurationMs).toBe(100);
    expect(updatedJob?.logs).toBeDefined();
    expect(updatedJob?.logs?.length).toBe(1);
  });
});
