#### 1. Context & Goal
- **Objective**: Implement the Cloudflare Workers execution adapter for distributed rendering.
- **Trigger**: The V2 Infrastructure backlog identifies Cloudflare Workers as a Tier 1 priority for cloud execution adapters.
- **Impact**: This unlocks running stateless rendering workers on the Cloudflare edge network, benefiting from their sub-50ms cold starts.

#### 2. File Inventory
- **Create**: `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts` (The Cloudflare Workers adapter implementation)
- **Create**: `packages/infrastructure/tests/adapters/cloudflare-workers-adapter.test.ts` (Unit tests for the adapter)
- **Create**: `packages/infrastructure/tests/benchmarks/cloudflare-workers-adapter.bench.ts` (Performance benchmarks for the adapter)
- **Create**: `examples/cloudflare-workers-execution/index.js` (Example script demonstrating usage)
- **Modify**: `packages/infrastructure/src/adapters/index.ts` (Export the new adapter)
- **Modify**: `packages/infrastructure/README.md` (Document the new adapter)
- **Read-Only**: `packages/infrastructure/src/types/adapter.ts`, `packages/infrastructure/src/adapters/aws-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: The `CloudflareWorkersAdapter` will implement the `WorkerAdapter` interface. It will send HTTP POST requests to the specified Cloudflare Worker route with a JSON payload containing `{ jobPath, chunkIndex }`.
- **Pseudo-Code**:
  ```typescript
  class CloudflareWorkersAdapter implements WorkerAdapter {
    constructor(private config: { workerUrl: string, apiToken?: string, jobDefUrl?: string }) {}
    async execute(job: WorkerJob): Promise<WorkerResult> {
      // validate jobDefUrl and chunkId
      // construct headers (Authorization: Bearer apiToken if provided)
      // construct payload { jobPath, chunkIndex }
      // fetch(workerUrl, { method: 'POST', body: JSON.stringify(payload) })
      // handle response status, JSON parse body (wrapped in try/catch)
      // return { exitCode, stdout, stderr, durationMs }
    }
  }
  ```
- **Public API Changes**: Export `CloudflareWorkersAdapter` and `CloudflareWorkersAdapterConfig` from `packages/infrastructure/src/adapters/index.ts`.
- **Dependencies**: None. Uses native Node.js `fetch`.
- **Cloud Considerations**: Cloudflare Workers have a 128MB memory limit and CPU time limits. The adapter should handle timeouts and HTTP error statuses gracefully, returning appropriate exit codes and stderr messages without crashing the JobExecutor. HTTP server implementations inside the worker (future task) must wrap `JSON.parse` in try/catch to avoid unhandled rejections returning 500s.

#### 4. Test Plan
- **Verification**: Run `npm run test` inside `packages/infrastructure`. Run `npm run lint -w packages/infrastructure` from root.
- **Success Criteria**: All tests pass, including new unit tests for `CloudflareWorkersAdapter` mocking `fetch` responses (success, non-200 status, invalid JSON body, network errors).
- **Edge Cases**: Network timeouts, 4xx/5xx HTTP errors from Cloudflare, malformed JSON responses from the worker.
- **Integration Verification**: Run the `examples/cloudflare-workers-execution/index.js` script to ensure it correctly initializes the adapter and integrates with `JobExecutor`.
