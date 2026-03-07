import { describe, bench, beforeAll, afterAll } from 'vitest';
import { FileJobRepository } from '../../src/orchestrator/file-job-repository.js';
import { JobStatus } from '../../src/types/job-status.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

describe('FileJobRepository Benchmark', () => {
  const tmpDir = path.join(process.cwd(), '.tmp', 'file-job-repository-bench');
  let repository: FileJobRepository;

  const dummyJob: JobStatus = {
    id: 'bench-job-1',
    spec: {
      id: 'spec-1',
      version: 1,
      compositionId: 'comp-1',
      duration: 10,
      fps: 30,
      width: 1920,
      height: 1080,
    },
    state: 'running',
    progress: 50,
    totalChunks: 10,
    completedChunks: 5,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    repository = new FileJobRepository(tmpDir);
    // Ensure initial file is created for the read benchmark
    await repository.save(dummyJob);
  });

  afterAll(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to cleanup tmp dir:', e);
    }
  });

  bench('Save Job Status', async () => {
    // Modify slightly to simulate updates
    dummyJob.updatedAt = Date.now();
    await repository.save(dummyJob);
  });

  bench('Get Job Status', async () => {
    await repository.get('bench-job-1');
  });
});
