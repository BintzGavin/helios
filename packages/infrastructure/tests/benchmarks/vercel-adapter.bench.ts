import { describe, bench, vi, beforeAll, afterAll } from 'vitest';
import { VercelAdapter } from '../../src/adapters/vercel-adapter.js';

describe('VercelAdapter Benchmark', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: 'success',
        stderr: '',
        durationMs: 50
      })
    }));
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  const adapter = new VercelAdapter({
    serviceUrl: 'https://benchmark.vercel.app/api/render',
    jobDefUrl: 'https://storage/job.json'
  });

  bench('execute job chunk', async () => {
    await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
  });
});
