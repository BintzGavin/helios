#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `AzureFunctionsAdapter`.
- **Trigger**: The INFRASTRUCTURE domain is functionally aligned with the V2 vision, and adding performance benchmarks is an allowed fallback action. Benchmarks exist for cloud adapters like AWS Lambda, Cloud Run, and Cloudflare Workers, but the recently added `AzureFunctionsAdapter` lacks benchmark coverage.
- **Impact**: Quantifies the overhead of the Azure Functions adapter invocation, ensuring it remains performant and doesn't introduce unexpected latency for distributed cloud rendering.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/azure-functions-adapter.bench.ts`
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/adapters/azure-functions-adapter.ts`
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/types/job.ts`

#### 3. Implementation Spec
- **Architecture**: The benchmark will use `vitest bench` to measure the execution time of the `AzureFunctionsAdapter.execute` method. It will mock the global `fetch` API to simulate a successful response from Azure Functions without actual network I/O overhead, isolating the adapter's serialization, invocation wrapper, and response parsing logic.
- **Pseudo-Code**:
  ```typescript
  import { describe, bench, beforeAll, afterAll, vi } from 'vitest';
  import { AzureFunctionsAdapter } from '../../src/adapters/azure-functions-adapter.js';

  describe('AzureFunctionsAdapter Benchmark', () => {
    let adapter: AzureFunctionsAdapter;

    beforeAll(() => {
      // Mock global fetch to return a simulated Azure Functions JSON response
      global.fetch = vi.fn().mockResolvedValue(
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
      vi.mocked(global.fetch).mockClear();
      await adapter.execute({
        command: 'render',
        meta: { chunkId: 1 }
      });
    });
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Azure Functions billing is based on execution duration. Minimizing adapter/wrapper overhead ensures cost efficiency.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run bench -- tests/benchmarks/azure-functions-adapter.bench.ts --run`
- **Success Criteria**: The benchmark executes successfully and outputs performance metrics (e.g., ops/sec) for the `AzureFunctionsAdapter`.
- **Edge Cases**: N/A for benchmarks.
- **Integration Verification**: Ensure the benchmark script runs successfully locally and does not produce Vitest suite failures.
