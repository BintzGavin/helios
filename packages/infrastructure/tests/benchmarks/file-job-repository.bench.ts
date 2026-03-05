import { bench, describe, beforeAll, afterAll } from 'vitest';
import { FileJobRepository } from '../../src/orchestrator/file-job-repository.js';
import { JobStatus } from '../../src/types/job-status.js';
import { JobSpec } from '../../src/types/job-spec.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

describe('FileJobRepository Benchmark', () => {
  const baseDir = path.join(process.cwd(), 'tests', 'benchmarks', '.tmp');
  const storageDir = path.join(baseDir, 'file-job-repository');
  let repository: FileJobRepository;

  const dummySpec: JobSpec = {
    id: 'dummy',
    chunks: [],
    mergeCommand: '',
    metadata: { totalFrames: 0, fps: 30, width: 1920, height: 1080, duration: 0 }
  };

  beforeAll(async () => {
    await fs.mkdir(storageDir, { recursive: true });
    repository = new FileJobRepository(storageDir);
  });

  afterAll(async () => {
    try {
      await fs.rm(baseDir, { recursive: true, force: true });
    } catch {}
  });

  bench('write throughput', async () => {
    const jobId = randomUUID();
    const jobStatus: JobStatus = {
      id: jobId,
      spec: { ...dummySpec, id: jobId },
      state: 'pending',
      progress: 0,
      totalChunks: 0,
      completedChunks: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await repository.save(jobStatus);
  }, { time: 500 });

  const readJobId = randomUUID();

  beforeAll(async () => {
    const jobStatus: JobStatus = {
      id: readJobId,
      spec: { ...dummySpec, id: readJobId },
      state: 'pending',
      progress: 0,
      totalChunks: 0,
      completedChunks: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await repository.save(jobStatus);
  });

  bench('read throughput', async () => {
    await repository.get(readJobId);
  }, { time: 500 });
});
