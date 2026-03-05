import { bench, describe } from 'vitest';
import { S3StorageAdapter } from '../../src/storage/s3-storage.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

describe('S3StorageAdapter IO Benchmark', () => {
  const baseDir = path.join(process.cwd(), 'tests', 'benchmarks', '.tmp');

  const createDummyFile = async (dirPath: string, filename: string, sizeBytes: number) => {
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, filename);
    const buffer = Buffer.alloc(sizeBytes, '0');
    await fs.writeFile(filePath, buffer);
  };

  describe('1MB Payload', () => {
    let adapter1MB: S3StorageAdapter;
    const jobId1MB = randomUUID();
    const localDir1MB = path.join(baseDir, `s3-1mb-${jobId1MB}`);

    const setup1MB = async () => {
      await fs.mkdir(baseDir, { recursive: true });
      await createDummyFile(localDir1MB, 'asset.bin', 1024 * 1024); // 1MB

      adapter1MB = new S3StorageAdapter({
        bucket: 'test-bucket',
        region: 'us-east-1',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
      });

      // Override the client with a dummy that consumes/destroys streams
      // to avoid file descriptor leaks in the bench loop
      const dummyClient = {
        send: async (command: any) => {
          if (command.input?.Body && typeof command.input.Body.destroy === 'function') {
            command.input.Body.destroy();
          }
          return {};
        }
      };
      (adapter1MB as any).client = dummyClient;
    };

    const teardown1MB = async () => {
      try {
        await fs.rm(localDir1MB, { recursive: true, force: true });
      } catch {}
    };

    bench('S3StorageAdapter.uploadAssetBundle - 1MB', async () => {
      await adapter1MB.uploadAssetBundle(jobId1MB, localDir1MB);
    }, {
      time: 500,
      setup: setup1MB,
      teardown: teardown1MB
    });
  });

  describe('10MB Payload', () => {
    let adapter10MB: S3StorageAdapter;
    const jobId10MB = randomUUID();
    const localDir10MB = path.join(baseDir, `s3-10mb-${jobId10MB}`);

    const setup10MB = async () => {
      await fs.mkdir(baseDir, { recursive: true });
      await createDummyFile(localDir10MB, 'asset.bin', 10 * 1024 * 1024); // 10MB

      adapter10MB = new S3StorageAdapter({
        bucket: 'test-bucket',
        region: 'us-east-1',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
      });

      // Override the client with a dummy that consumes/destroys streams
      // to avoid file descriptor leaks in the bench loop
      const dummyClient = {
        send: async (command: any) => {
          if (command.input?.Body && typeof command.input.Body.destroy === 'function') {
            command.input.Body.destroy();
          }
          return {};
        }
      };
      (adapter10MB as any).client = dummyClient;
    };

    const teardown10MB = async () => {
      try {
        await fs.rm(localDir10MB, { recursive: true, force: true });
      } catch {}
    };

    bench('S3StorageAdapter.uploadAssetBundle - 10MB', async () => {
      await adapter10MB.uploadAssetBundle(jobId10MB, localDir10MB);
    }, {
      time: 500,
      setup: setup10MB,
      teardown: teardown10MB
    });
  });

});
