import { bench, describe } from 'vitest';
import { LocalWorkerAdapter } from '../../src/adapters/local-adapter.js';
import type { WorkerJob } from '../../src/types/index.js';

describe('LocalWorkerAdapter Performance', () => {
  const adapter = new LocalWorkerAdapter();

  // Use a simple, fast node process to minimize execution time of the child process itself.
  // process.execPath is the path to the current Node executable.
  const fastJob: WorkerJob = {
    command: process.execPath,
    args: ['-e', '0'], // immediately exits with code 0
  };

  const timeoutJob: WorkerJob = {
    command: process.execPath,
    // The command simulates a long running process that gets killed by the adapter.
    args: ['-e', 'setTimeout(() => {}, 10000)'],
    timeout: 10,
  };

  bench('execute (fast process)', async () => {
    await adapter.execute(fastJob);
  });

  bench('execute (with timeout)', async () => {
    try {
      await adapter.execute(timeoutJob);
    } catch (e) {
      // It is expected to reject due to timeout.
    }
  });
});
