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

  it('should not throw if trying to pause/cancel a deleted job', async () => {
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
    const jobId = await jobManager.submitJob(spec, { adapter: { execute: vi.fn() } as any });

    // Simulate job deletion before pause/cancel
    await repository.delete(jobId);

    // Attempt to cancel
    await jobManager.pauseJob(jobId);

    // It should not be recreated
    const exists = await repository.get(jobId);
    expect(exists).toBeUndefined();
  });

  it('should catch and log error if runJob fails during submitJob', async () => {
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
    // Force repository.get to throw an error during runJob execution (simulating a runJob failure)
    vi.spyOn(repository, 'get').mockRejectedValueOnce(new Error('Simulated submitJob runJob error'));
    await jobManager.submitJob(spec, { adapter: { execute: vi.fn() } as any });
    // wait for async background runJob to complete and catch block to trigger
    await new Promise(process.nextTick);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unhandled error in job'), expect.any(Error));
  });

  it('should return early if job not found or wrong state in cancelJob', async () => {
    await jobManager.cancelJob('nonexistent-job');
    const job: JobStatus = { id: 'test-job', spec: { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' }, state: 'completed', progress: 100, totalChunks: 0, completedChunks: 0, createdAt: Date.now(), updatedAt: Date.now() };
    await repository.save(job);
    await jobManager.cancelJob('test-job');
  });

  it('should return early if job not found or wrong state in resumeJob', async () => {
    await jobManager.resumeJob('nonexistent-job');
    const job: JobStatus = { id: 'test-job', spec: { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' }, state: 'completed', progress: 100, totalChunks: 0, completedChunks: 0, createdAt: Date.now(), updatedAt: Date.now() };
    await repository.save(job);
    await jobManager.resumeJob('test-job');
  });

  it('should catch and log error if runJob fails during resumeJob', async () => {
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };
    const job: JobStatus = { id: 'test-job', spec, state: 'paused', progress: 0, totalChunks: 0, completedChunks: 0, createdAt: Date.now(), updatedAt: Date.now(), logs: [{ chunkId: 1, durationMs: 100, stdout: '', stderr: '' }] };
    await repository.save(job);
    // Force repository.get to throw an error during runJob execution (simulating a runJob failure)
    vi.spyOn(repository, 'get').mockImplementationOnce(async () => job).mockRejectedValueOnce(new Error('Simulated resumeJob runJob error'));
    await jobManager.resumeJob('test-job', { adapter: { execute: vi.fn() } as any });
    // wait for async background runJob to complete and catch block to trigger
    await new Promise(process.nextTick);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unhandled error resuming job test-job:'), expect.any(Error));
  });

  it('should return early if job not found in deleteJob', async () => {
    await jobManager.deleteJob('nonexistent-job');
  });

  it('should handle storage upload initialization and failure correctly', async () => {
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    // Create the job first so it's in the repo
    const jobId = await jobManager.submitJob(spec, { adapter: { execute: vi.fn() } as any });

    const options = { jobDir: '/tmp/test' };

    // Simulate an error during upload
    (storage.uploadAssetBundle as any).mockRejectedValueOnce(new Error('Upload failed'));

    const originalRunJob = (jobManager as any).runJob;
    await originalRunJob.call(jobManager, jobId, spec, options);

    const job = await repository.get(jobId);
    expect(job?.state).toBe('failed');
    expect(job?.error).toContain('Upload failed');
  });

  it('should save job meta even if missing initially', async () => {
    const spec: JobSpec = { id: 'test-job', chunks: [], metadata: { totalFrames: 10, fps: 30, width: 100, height: 100, duration: 1 }, mergeCommand: '' };

    const jobId = await jobManager.submitJob(spec, { adapter: { execute: vi.fn() } as any });
    const jobBefore = await repository.get(jobId);
    if(jobBefore) {
        delete jobBefore.meta;
        await repository.save(jobBefore);
    }

    const options = { jobDir: '/tmp/test' };

    (storage.uploadAssetBundle as any).mockResolvedValueOnce('s3://assets');
    (storage.uploadJobSpec as any).mockResolvedValueOnce('s3://spec');

    // Mock the repository save so we can inspect what runJob tried to save
    const saveSpy = vi.spyOn(repository, 'save');

    // We need to trigger the execution to properly wait for all promises.
    // By passing options.jobDir, we'll force the upload block to execute
    await (jobManager as any).runJob(jobId, spec, options);

    // Give it a tiny bit of time to ensure all microtasks are done
    await new Promise(resolve => setTimeout(resolve, 50));

    // Look at what was saved. The last save is probably the completed state.
    // But any of the saves should have the meta set.
    const savedJobs = saveSpy.mock.calls.map(call => call[0]);
    const jobWithMeta = savedJobs.find(j => j.meta?.jobDefUrl === 's3://spec');

    expect(jobWithMeta).toBeDefined();
    expect(jobWithMeta?.meta?.jobDefUrl).toBe('s3://spec');
  });
});
