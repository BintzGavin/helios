import { bench, describe, beforeAll, afterAll } from 'vitest';
import { WorkerRuntime } from '../../src/worker/runtime.js';
import { LocalStorageAdapter } from '../../src/storage/local-storage.js';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('WorkerRuntime Benchmarks', () => {
  const baseDir = path.join(process.cwd(), 'tests', 'benchmarks', '.tmp', 'worker-runtime-bench');
  const workspaceDir = path.join(baseDir, 'workspace');
  const storageDir = path.join(baseDir, 'storage');

  const localJobPath = path.join(baseDir, 'local-job.json');
  const mockRemoteJobUrl = 'http://mock.url/job.json';

  let storageAdapter: LocalStorageAdapter;
  let runtime: WorkerRuntime;
  let originalFetch: typeof fetch;

  beforeAll(async () => {
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.mkdir(storageDir, { recursive: true });

    storageAdapter = new LocalStorageAdapter({ baseDir: storageDir });
    runtime = new WorkerRuntime({ workspaceDir, storage: storageAdapter });

    // Mock local job
    const jobSpec = {
      id: 'bench-job',
      chunks: [
        { id: 0, command: 'echo "test chunk 0"', outputFile: 'out0.mp4' }
      ]
    };
    await fs.writeFile(localJobPath, JSON.stringify(jobSpec));

    // Mock remote job with assets URL
    const remoteJobSpec = {
      ...jobSpec,
      assetsUrl: 'local://bench-job'
    };

    // Create an empty dummy asset folder to download
    await fs.mkdir(path.join(storageDir, 'bench-job'), { recursive: true });

    originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url === mockRemoteJobUrl) {
        return {
          ok: true,
          json: async () => remoteJobSpec
        } as any;
      }
      return originalFetch(url);
    };
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    try {
      await fs.rm(baseDir, { recursive: true, force: true });
    } catch {}
  });

  bench('WorkerRuntime.run - local JobSpec', async () => {
    await runtime.run(localJobPath, 0);
  });

  bench('WorkerRuntime.run - remote JobSpec with assets', async () => {
    await runtime.run(mockRemoteJobUrl, 0);
  });
});
