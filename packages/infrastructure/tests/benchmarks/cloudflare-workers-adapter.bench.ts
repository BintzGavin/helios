import { describe, bench, vi } from 'vitest';
import { CloudflareWorkersAdapter } from '../../src/adapters/cloudflare-workers-adapter.js';

describe('CloudflareWorkersAdapter Benchmark', () => {
  global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ exitCode: 0, stdout: 'success' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const adapter = new CloudflareWorkersAdapter({
    serviceUrl: 'https://benchmark.workers.dev',
    jobDefUrl: 's3://bucket/job.json'
  });

  bench('execute job chunk', async () => {
    await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
  });
});
