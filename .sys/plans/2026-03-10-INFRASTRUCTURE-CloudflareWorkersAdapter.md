#### 1. Context & Goal
- **Objective**: Implement a Cloudflare Workers execution adapter (`CloudflareWorkersAdapter`) that implements the `WorkerAdapter` interface.
- **Trigger**: The backlog specifies "Cloud execution adapter (Cloudflare Workers)" as a Tier 1 item.
- **Impact**: Enables distributed execution on Cloudflare Workers, providing sub-50ms cold starts for high-performance job processing.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts`: The adapter implementation.
  - `packages/infrastructure/tests/adapters/cloudflare-workers-adapter.test.ts`: Unit and resiliency tests.
  - `packages/infrastructure/tests/benchmarks/cloudflare-workers-adapter.bench.ts`: Benchmark tests.
  - `examples/distributed-rendering/cloudflare-workers-example.js`: Example script demonstrating its usage.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts`: Export the new adapter.
  - `packages/infrastructure/README.md`: Document the new adapter under Cloud Execution Adapters.

#### 3. Implementation Spec
- **Architecture**: A stateless adapter that implements `WorkerAdapter`. It will send an HTTP POST request to a configured Cloudflare Worker route.
- **Config Interface**:
  - `endpointUrl` (string): The URL of the Cloudflare Worker.
  - `apiToken` (string, optional): A Bearer token or service token for authentication.
  - `jobDefUrl` (string, optional): Default job definition URL.
- **Payload**:
  ```json
  {
    "jobPath": "url_to_job_spec",
    "chunkIndex": 0
  }
  ```
- **Error Handling**: Wrap the `fetch` and parsing logic in `try/catch`. Gracefully handle HTTP errors and JSON parsing errors, returning `exitCode: 1` and appropriate `stderr`. Ensure `JSON.parse` is wrapped in a `try/catch`.
- **Public API Changes**: Export `CloudflareWorkersAdapter` and its configuration interface `CloudflareWorkersAdapterConfig`.
- **Cloud Considerations**: Uses standard `fetch` API. Handles `AbortSignal` from the job for cancellation.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- tests/adapters/cloudflare-workers-adapter.test.ts`
- **Success Criteria**: Tests pass, verifying successful execution, error handling (HTTP 500, invalid JSON), and cancellation (AbortSignal).
- **Benchmark**: Run `cd packages/infrastructure && npm run bench -- tests/benchmarks/cloudflare-workers-adapter.bench.ts --run` to measure invocation overhead.
