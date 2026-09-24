import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileJobRepository } from '../../src/orchestrator/file-job-repository.js';
import { JobStatus } from '../../src/types/job-status.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// The fs functions used by the repository are wrapped in spies that delegate to the real
// implementation, so the happy-path suite below still exercises the real filesystem while the
// resiliency suite can inject failures with mockRejectedValueOnce / mockResolvedValueOnce.
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    default: {
      ...actual,
      mkdir: vi.fn(actual.mkdir),
      writeFile: vi.fn(actual.writeFile),
      readFile: vi.fn(actual.readFile),
      readdir: vi.fn(actual.readdir),
      unlink: vi.fn(actual.unlink),
    }
  };
});

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

  it('should delete a job file', async () => {
    await repository.save(mockJob);

    // Check if the file was actually created
    const filePath = path.join(tmpDir, `${mockJob.id}.json`);
    let fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    await repository.delete(mockJob.id);

    // Check if the file was deleted
    fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);

    // Get should return undefined
    const retrievedJob = await repository.get(mockJob.id);
    expect(retrievedJob).toBeUndefined();
  });

  it('should not throw when deleting a non-existent job file', async () => {
    await expect(repository.delete('non-existent-id')).resolves.toBeUndefined();
  });
});

describe('FileJobRepository resiliency (mocked fs failures)', () => {
  const tmpDir = '/fake/tmp/dir';
  let repository: FileJobRepository;

  const mockJob: JobStatus = {
    id: 'resiliency-test-job',
    state: 'pending',
    progress: 0,
    totalChunks: 2,
    completedChunks: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  beforeEach(() => {
    repository = new FileJobRepository(tmpDir);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('save', () => {
    it('should throw if fs.mkdir fails with a permission error', async () => {
      const error = new Error('EACCES: permission denied, mkdir');
      (error as any).code = 'EACCES';
      vi.mocked(fs.mkdir).mockRejectedValueOnce(error);

      await expect(repository.save(mockJob)).rejects.toThrow('EACCES');
    });

    it('should throw if fs.writeFile fails with a permission error', async () => {
      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
      const error = new Error('EACCES: permission denied, open');
      (error as any).code = 'EACCES';
      vi.mocked(fs.writeFile).mockRejectedValueOnce(error);

      await expect(repository.save(mockJob)).rejects.toThrow('EACCES');
    });
  });

  describe('get', () => {
    it('should throw if fs.readFile fails with a permission error', async () => {
      const error = new Error('EACCES: permission denied, open');
      (error as any).code = 'EACCES';
      vi.mocked(fs.readFile).mockRejectedValueOnce(error);

      await expect(repository.get(mockJob.id)).rejects.toThrow('EACCES');
    });

    it('should throw if the file contains corrupted JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce('{"invalid": json');

      await expect(repository.get(mockJob.id)).rejects.toThrow(SyntaxError);
    });
  });

  describe('list', () => {
    it('should ignore files that throw a non-ENOENT error during fs.readFile (e.g. EACCES)', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['job1.json', 'job2.json'] as any);

      const error = new Error('EACCES: permission denied');
      (error as any).code = 'EACCES';

      vi.mocked(fs.readFile)
        .mockRejectedValueOnce(error) // Fails for job1.json
        .mockResolvedValueOnce(JSON.stringify(mockJob)); // Succeeds for job2.json

      const result = await repository.list();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockJob.id);
    });

    it('should ignore files with corrupted JSON and still return valid jobs', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['corrupted.json', 'valid.json'] as any);

      vi.mocked(fs.readFile)
        .mockResolvedValueOnce('{"corrupt": true') // Fails for corrupted.json
        .mockResolvedValueOnce(JSON.stringify(mockJob)); // Succeeds for valid.json

      const result = await repository.list();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockJob.id);
    });
  });

  describe('delete', () => {
    it('should throw if fs.unlink fails with a permission error', async () => {
      const error = new Error('EACCES: permission denied, unlink');
      (error as any).code = 'EACCES';
      vi.mocked(fs.unlink).mockRejectedValueOnce(error);

      await expect(repository.delete(mockJob.id)).rejects.toThrow('EACCES');
    });
  });
});
