import { bench, describe, beforeAll } from 'vitest';
import { LocalWorkerAdapter } from '../../src/adapters/local-adapter.js';
import type { WorkerJob } from '../../src/types/index.js';

describe('LocalWorkerAdapter Performance', () => {
  let adapter: LocalWorkerAdapter;
  let fastJob: WorkerJob;
  let timeoutJob: WorkerJob;

  beforeAll(() => {
    adapter = new LocalWorkerAdapter();
    fastJob = {
      id: 'fast-job',
      command: process.execPath,
      args: ['-e', '0'],
      metadata: {},
    };
    timeoutJob = {
      id: 'timeout-job',
      command: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 10000)'],
      timeout: 10,
      metadata: {},
    };
  });

  bench('execute (fast process)', async () => {
    await adapter.execute(fastJob);
  });

  bench('execute (with timeout)', async () => {
    try {
      await adapter.execute(timeoutJob);
    } catch (e) {
      // Ignore timeout error
    }
  });
});
