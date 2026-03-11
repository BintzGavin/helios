import { describe, bench, beforeAll, afterAll, vi } from 'vitest';
import { FlyMachinesAdapter } from '../../src/adapters/fly-machines-adapter.js';

describe('FlyMachinesAdapter Benchmark', () => {
  const adapter = new FlyMachinesAdapter({
    apiToken: 'bench-token',
    appName: 'bench-app',
    imageRef: 'bench-image',
  });
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      if (init?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 'bench-machine' }) };
      }
      if (init?.method === 'DELETE') {
        return { ok: true };
      }
      return { ok: true, json: async () => ({ state: 'stopped', events: [{ request: { exit_event: { exit_code: 0 } } }] }) };
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  bench('execute mock Fly Machine', async () => {
    vi.mocked(global.fetch).mockClear();
    const job = {
      command: 'node',
      meta: { jobDefUrl: 'http://bench.com/job.json', chunkIndex: 0 },
    };
    await adapter.execute(job);
  });
});
