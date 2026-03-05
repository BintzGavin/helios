import { bench, describe } from 'vitest';
import { GcsStorageAdapter } from '../../src/storage/gcs-storage.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

describe('GcsStorageAdapter IO Benchmark', () => {
  const baseDir = path.join(process.cwd(), 'tests', 'benchmarks', '.tmp');

  const createDummyFile = async (dirPath: string, filename: string, sizeBytes: number) => {
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, filename);
    const buffer = Buffer.alloc(sizeBytes, '0');
    await fs.writeFile(filePath, buffer);
  };

  describe('1MB Payload', () => {
    let adapter1MB: GcsStorageAdapter;
    const jobId1MB = randomUUID();
    const localDir1MB = path.join(baseDir, `gcs-1mb-${jobId1MB}`);

    const setup1MB = async () => {
      await fs.mkdir(baseDir, { recursive: true });
      await createDummyFile(localDir1MB, 'asset.bin', 1024 * 1024); // 1MB

      adapter1MB = new GcsStorageAdapter({
        bucket: 'test-bucket',
      });

      // Override the client with a dummy that skips actual upload
      const dummyBucket = {
        upload: async () => {
          return [{}]; // simulate response
        }
      };

      const dummyClient = {
        bucket: () => dummyBucket
      };
      (adapter1MB as any).client = dummyClient;
    };

    const teardown1MB = async () => {
      try {
        await fs.rm(localDir1MB, { recursive: true, force: true });
      } catch {}
    };

    const uploadAssetBundle = async () => {
      try {
        await adapter1MB.uploadAssetBundle(jobId1MB, localDir1MB);
      } catch (e) {
        // ignore if it doesn't exist during the final tear down iteration
      }
    };

    bench('GcsStorageAdapter.uploadAssetBundle - 1MB', async () => {
      await uploadAssetBundle();
    }, {
      time: 500,
      setup: setup1MB,
      teardown: teardown1MB
    });
  });

  describe('10MB Payload', () => {
    let adapter10MB: GcsStorageAdapter;
    const jobId10MB = randomUUID();
    const localDir10MB = path.join(baseDir, `gcs-10mb-${jobId10MB}`);

    const setup10MB = async () => {
      await fs.mkdir(baseDir, { recursive: true });
      await createDummyFile(localDir10MB, 'asset.bin', 10 * 1024 * 1024); // 10MB

      adapter10MB = new GcsStorageAdapter({
        bucket: 'test-bucket',
      });

      // Override the client with a dummy that skips actual upload
      const dummyBucket = {
        upload: async () => {
          return [{}]; // simulate response
        }
      };

      const dummyClient = {
        bucket: () => dummyBucket
      };
      (adapter10MB as any).client = dummyClient;
    };

    const teardown10MB = async () => {
      try {
        await fs.rm(localDir10MB, { recursive: true, force: true });
      } catch {}
    };

    const uploadAssetBundle = async () => {
      try {
        await adapter10MB.uploadAssetBundle(jobId10MB, localDir10MB);
      } catch (e) {
        // ignore if it doesn't exist during the final tear down iteration
      }
    };

    bench('GcsStorageAdapter.uploadAssetBundle - 10MB', async () => {
      await uploadAssetBundle();
    }, {
      time: 500,
      setup: setup10MB,
      teardown: teardown10MB
    });
  });

});
