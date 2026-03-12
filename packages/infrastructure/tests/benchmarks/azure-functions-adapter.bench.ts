import { describe, bench, beforeAll, afterAll, vi } from 'vitest';
import { AzureFunctionsAdapter } from '../../src/adapters/azure-functions-adapter.js';

describe('AzureFunctionsAdapter Benchmark', () => {
  let adapter: AzureFunctionsAdapter;

  beforeAll(() => {
    // Mock global fetch to return a simulated Azure Functions JSON response
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ exitCode: 0, stdout: 'mock rendered chunk output', stderr: '' }), {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' })
      })
    );

    adapter = new AzureFunctionsAdapter({
      serviceUrl: 'https://benchmark-app.azurewebsites.net/api/renderChunk',
      functionKey: 'mock-function-key-123',
      jobDefUrl: 's3://bucket/test-job.json'
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  bench('execute job chunk on azure functions', async () => {
    // Mock clearing must happen per iteration, not in setup option
    vi.mocked(globalThis.fetch).mockClear();
    await adapter.execute({
      id: 'demo-job',
      command: 'render',
      args: [],
      env: {},
      meta: { chunkId: 1 }
    });
  });
});
