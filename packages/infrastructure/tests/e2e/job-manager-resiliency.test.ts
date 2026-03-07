import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobManager } from '../../src/orchestrator/job-manager.js';
import { JobExecutor, JobExecutionOptions } from '../../src/orchestrator/job-executor.js';
import { InMemoryJobRepository, JobStatus } from '../../src/types/job-status.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { ArtifactStorage } from '../../src/types/storage.js';

describe('JobManager Resiliency Tests', () => {
  let repository: InMemoryJobRepository;
  let executor: JobExecutor;
  let storage: ArtifactStorage;
  let manager: JobManager;
  let jobSpec: JobSpec;

  beforeEach(() => {
    repository = new InMemoryJobRepository();

    executor = {
      execute: vi.fn().mockResolvedValue(undefined)
    } as unknown as JobExecutor;

    storage = {
      uploadAssetBundle: vi.fn().mockResolvedValue('s3://test/assets'),
      downloadAssetBundle: vi.fn().mockResolvedValue(undefined),
      deleteAssetBundle: vi.fn().mockResolvedValue(undefined),
      uploadJobSpec: vi.fn().mockResolvedValue('s3://test/job.json'),
      downloadJobSpec: vi.fn().mockResolvedValue(undefined),
      deleteJobSpec: vi.fn().mockResolvedValue(undefined)
    } as ArtifactStorage;

    manager = new JobManager(repository, executor, storage);

    jobSpec = {
      id: 'test-job',
      chunks: [
        { id: 1, command: 'echo "1"', outputFile: 'out1.mp4' },
      ]
    };
  });

  it('JobManager should gracefully handle failures from JobRepository during save', async () => {
    // Mock the repository to throw an error
    const errorMsg = 'Database connection failed';
    vi.spyOn(repository, 'save').mockRejectedValue(new Error(errorMsg));

    // Expected to reject with the error thrown by save
    await expect(manager.submitJob(jobSpec)).rejects.toThrow(errorMsg);
  });

  it('JobManager should catch and handle errors thrown by ArtifactStorage during asset upload', async () => {
    // Mock storage to throw an error during upload
    const errorMsg = 'S3 Upload Failed';
    vi.spyOn(storage, 'uploadAssetBundle').mockRejectedValue(new Error(errorMsg));

    // submitJob does not await the job execution, so it should not throw
    const jobId = await manager.submitJob(jobSpec, { jobDir: '/tmp/test' });

    // Wait for the background process to update the job state
    await vi.waitFor(async () => {
      const job = await manager.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.state).toBe('failed');
      expect(job?.error).toContain(errorMsg);
    });
  });

  it('JobManager should catch and handle errors thrown by ArtifactStorage during job spec upload', async () => {
    // Mock storage to throw an error during upload
    const errorMsg = 'S3 JobSpec Upload Failed';
    vi.spyOn(storage, 'uploadJobSpec').mockRejectedValue(new Error(errorMsg));

    // submitJob does not await the job execution, so it should not throw
    const jobId = await manager.submitJob(jobSpec, { jobDir: '/tmp/test' });

    // Wait for the background process to update the job state
    await vi.waitFor(async () => {
      const job = await manager.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.state).toBe('failed');
      expect(job?.error).toContain(errorMsg);
    });
  });

  it('JobManager should transition state to failed when JobExecutor throws an error', async () => {
    // Mock executor to throw an error during execution
    const errorMsg = 'Execution totally failed';
    vi.spyOn(executor, 'execute').mockRejectedValue(new Error(errorMsg));

    const jobId = await manager.submitJob(jobSpec);

    // Wait for the background process to catch the error and update the job state
    await vi.waitFor(async () => {
      const job = await manager.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.state).toBe('failed');
      expect(job?.error).toBe(errorMsg);
    });
  });
});
