import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryJobRepository, JobStatus, JobState } from '../../src/types/job-status.js';
import { JobSpec } from '../../src/types/job-spec.js';

describe('InMemoryJobRepository', () => {
  let repository: InMemoryJobRepository;

  const mockJobSpec: JobSpec = {
    projectId: 'test-project',
    frames: { start: 0, end: 10 },
    resolution: { width: 1920, height: 1080 },
    fps: 30
  };

  const createMockJob = (id: string): JobStatus => ({
    id,
    spec: mockJobSpec,
    state: 'pending' as JobState,
    progress: 0,
    totalChunks: 1,
    completedChunks: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  beforeEach(() => {
    repository = new InMemoryJobRepository();
  });

  it('should save and retrieve a job', async () => {
    const job = createMockJob('job-1');
    await repository.save(job);
    const retrieved = await repository.get('job-1');
    expect(retrieved).toEqual(job);
    expect(retrieved).not.toBe(job); // Should be a clone
  });

  it('should return undefined for non-existent job', async () => {
    const retrieved = await repository.get('unknown-job');
    expect(retrieved).toBeUndefined();
  });

  it('should list all saved jobs', async () => {
    const job1 = createMockJob('job-1');
    const job2 = createMockJob('job-2');
    await repository.save(job1);
    await repository.save(job2);

    const jobs = await repository.list();
    expect(jobs).toHaveLength(2);
    expect(jobs).toEqual(expect.arrayContaining([job1, job2]));
  });

  it('should delete a job', async () => {
    const job = createMockJob('job-1');
    await repository.save(job);
    await repository.delete('job-1');

    const retrieved = await repository.get('job-1');
    expect(retrieved).toBeUndefined();
  });
});
