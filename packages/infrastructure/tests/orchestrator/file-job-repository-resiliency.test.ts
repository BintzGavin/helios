import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileJobRepository } from '../../src/orchestrator/file-job-repository.js';
import { JobStatus } from '../../src/types/job-status.js';
import fs from 'node:fs/promises';
import path from 'node:path';

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

describe('FileJobRepository Resiliency', () => {
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
