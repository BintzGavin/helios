import { describe, bench } from 'vitest';
import { LocalWorkerAdapter } from '../../src/adapters/local-adapter.js';

describe('LocalWorkerAdapter Performance', () => {
  const adapter = new LocalWorkerAdapter();

  // Command that executes quickly to measure adapter overhead
  const fastJobCommand = {
    command: 'node',
    args: ['-e', 'console.log("done")'],
  };

  bench('execute (fast process)', async () => {
    await adapter.execute(fastJobCommand);
  });

  bench('execute (with timeout)', async () => {
    await adapter.execute({
      ...fastJobCommand,
      timeout: 5000,
    });
  });
});
