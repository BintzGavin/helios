import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileJobRepository } from '../../src/orchestrator/file-job-repository.js';
import { JobStatus } from '../../src/types/job-status.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('FileJobRepository', () => {
  let tmpDir: string;
  let repository: FileJobRepository;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'helios-job-repo-test-'));
    repository = new FileJobRepository(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const mockJob: JobStatus = {
    id: 'test-job-1',
    state: 'pending',
    progress: 0,
    totalChunks: 2,
    completedChunks: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  it('should save a job to a file and retrieve it', async () => {
    await repository.save(mockJob);

    const retrievedJob = await repository.get(mockJob.id);
    expect(retrievedJob).toBeDefined();
    expect(retrievedJob?.id).toBe(mockJob.id);
    expect(retrievedJob?.state).toBe(mockJob.state);

    // Check if the file was actually created
    const filePath = path.join(tmpDir, `${mockJob.id}.json`);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  it('should return undefined when getting a non-existent job', async () => {
    const retrievedJob = await repository.get('non-existent-id');
    expect(retrievedJob).toBeUndefined();
  });

  it('should list all saved jobs', async () => {
    const job2: JobStatus = { ...mockJob, id: 'test-job-2' };

    await repository.save(mockJob);
    await repository.save(job2);

    const list = await repository.list();
    expect(list).toHaveLength(2);
    expect(list.map(j => j.id)).toContain(mockJob.id);
    expect(list.map(j => j.id)).toContain(job2.id);
  });

  it('should return an empty array if storage directory is empty or does not exist', async () => {
    // Wait for the beforeEach to create it, then delete it to test ENOENT
    await fs.rm(tmpDir, { recursive: true, force: true });

    const list = await repository.list();
    expect(list).toEqual([]);
  });

  it('should create the storage directory if it does not exist during save', async () => {
    const nonExistentDir = path.join(tmpDir, 'nested', 'dir');
    const repo = new FileJobRepository(nonExistentDir);

    await repo.save(mockJob);

    const retrievedJob = await repo.get(mockJob.id);
    expect(retrievedJob?.id).toBe(mockJob.id);
  });

  it('should overwrite an existing job file on save', async () => {
    await repository.save(mockJob);

    const updatedJob = { ...mockJob, state: 'running' as const, progress: 50 };
    await repository.save(updatedJob);

    const retrievedJob = await repository.get(mockJob.id);
    expect(retrievedJob?.state).toBe('running');
    expect(retrievedJob?.progress).toBe(50);
  });
});
