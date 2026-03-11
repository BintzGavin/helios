import { bench, describe, vi, beforeAll, afterAll } from 'vitest';
import { DenoDeployAdapter } from '../../src/adapters/deno-deploy-adapter.js';

describe('DenoDeployAdapter Overhead', () => {
  const adapter = new DenoDeployAdapter({ serviceUrl: 'https://mock.deno.dev' });
  const job = {
    command: 'echo',
    args: ['benchmark'],
    cwd: '/tmp',
    env: {},
    meta: {
      jobDefUrl: 'https://storage/benchmark.json',
      chunkId: 0
    }
  };

  beforeAll(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: 'Benchmark output',
        stderr: '',
        durationMs: 50
      })
    }));
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  bench('execute command overhead with mocked fetch', async () => {
    await adapter.execute(job);
  });
});
