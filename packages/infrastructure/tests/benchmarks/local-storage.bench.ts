import { bench, describe } from 'vitest';
import { LocalStorageAdapter } from '../../src/storage/local-storage.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

describe('LocalStorageAdapter IO Benchmark', () => {
  const baseDir = path.join(process.cwd(), 'tests', 'benchmarks', '.tmp');
  const storageDir = path.join(baseDir, 'storage');

  const setupDirs = async () => {
    await fs.mkdir(storageDir, { recursive: true });
  };

  const teardownDirs = async () => {
    try {
      await fs.rm(baseDir, { recursive: true, force: true });
    } catch {}
  };

  const createDummyFile = async (dirPath: string, filename: string, sizeBytes: number) => {
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, filename);
    const buffer = Buffer.alloc(sizeBytes, '0');
    await fs.writeFile(filePath, buffer);
  };

  bench('LocalStorageAdapter.uploadAssetBundle - 1MB', async () => {
    // We recreate it per iteration to avoid conflicts or measuring cleanup in bench
    const jobId = randomUUID();
    const localDir = path.join(baseDir, `local-1mb-${jobId}`);
    await createDummyFile(localDir, 'asset.bin', 1024 * 1024); // 1MB

    const adapter = new LocalStorageAdapter({ storageDir });
    await adapter.uploadAssetBundle(jobId, localDir);
  }, {
    time: 500,
    setup: setupDirs,
    teardown: teardownDirs
  });

  bench('LocalStorageAdapter.uploadAssetBundle - 10MB', async () => {
    const jobId = randomUUID();
    const localDir = path.join(baseDir, `local-10mb-${jobId}`);
    await createDummyFile(localDir, 'asset.bin', 10 * 1024 * 1024); // 10MB

    const adapter = new LocalStorageAdapter({ storageDir });
    await adapter.uploadAssetBundle(jobId, localDir);
  }, {
    time: 500,
    setup: setupDirs,
    teardown: teardownDirs
  });

});
