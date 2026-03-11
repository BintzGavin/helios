import { bench, describe } from 'vitest';
import { KubernetesAdapter } from '../../src/adapters/kubernetes-adapter.js';

describe('KubernetesAdapter Benchmark', () => {
  const adapter = new KubernetesAdapter({
    image: 'alpine',
    pollIntervalMs: 1,
  });

  bench('execute job successfully', async () => {
    await adapter.execute({
      command: 'echo',
      args: ['test'],
    });
  });
});
