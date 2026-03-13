import { bench, describe } from 'vitest';
import { ModalAdapter } from '../../src/adapters/modal-adapter.js';

describe('ModalAdapter Benchmark', () => {
  const adapter = new ModalAdapter({
    endpointUrl: 'http://localhost',
  });

  bench('execute job successfully', async () => {
    global.fetch = () => Promise.resolve({
      ok: true,
      json: async () => ({ exitCode: 0, stdout: 'benchmark', stderr: '' }),
    } as any);

    await adapter.execute({
      command: 'echo',
      args: ['benchmark'],
    });
  });
});
