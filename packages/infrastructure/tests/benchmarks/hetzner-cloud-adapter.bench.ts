import { describe, bench, vi, beforeAll, afterAll } from 'vitest';
import { HetznerCloudAdapter } from '../../src/adapters/hetzner-cloud-adapter.js';

describe('HetznerCloudAdapter Benchmark', () => {
  const config = {
    apiToken: 'bench-token',
    serverType: 'cx11',
    image: 'ubuntu-20.04',
    pollIntervalMs: 1, // Minimal for fast bench
  };

  const adapter = new HetznerCloudAdapter(config);

  const job = {
    command: 'npm',
    args: ['run', 'render'],
  };

  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ server: { id: 1, status: 'off' } }), // Instantly off
    } as any);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  bench('execute lifecycle', async () => {
    vi.mocked(global.fetch).mockClear();
    await adapter.execute(job);
  });
});
