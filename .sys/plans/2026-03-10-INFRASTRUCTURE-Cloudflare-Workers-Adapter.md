#### 1. Context & Goal
- **Objective**: Implement a `WorkerAdapter` for Cloudflare Workers to support distributed rendering.
- **Trigger**: Vision gap identified in `docs/BACKLOG.md` under "Platform Expansion" -> "Tier 1 — High Impact, Low Friction" for Cloudflare Workers.
- **Impact**: Enables utilizing Cloudflare's edge network for extremely fast (<50ms cold start) stateless rendering tasks, providing a high-performance alternative to existing AWS and GCP adapters.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts` (The Cloudflare Workers adapter implementation)
  - `packages/infrastructure/tests/adapters/cloudflare-workers-adapter.test.ts` (Unit tests for the adapter)
  - `packages/infrastructure/tests/benchmarks/cloudflare-workers-adapter.bench.ts` (Performance benchmarks for the adapter)
  - `packages/infrastructure/examples/cloudflare-workers-adapter-example.ts` (Standalone example demonstrating usage)
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts` (Export the new `cloudflare-workers-adapter.ts`)
- **Read-Only**:
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/types/job.ts`

#### 3. Implementation Spec
- **Architecture**: Create `CloudflareWorkersAdapter` implementing the `WorkerAdapter` interface. It will use the native `fetch` API to send a POST request to the configured Cloudflare Worker route, mirroring the payload structure expected by existing stateless workers.
- **Pseudo-Code**:
  - Define `CloudflareWorkersAdapterConfig` interface with `serviceUrl`, optional `authToken` (for Cloudflare service token header or mTLS context), and optional `jobDefUrl`.
  - Create `CloudflareWorkersAdapter` class implementing `WorkerAdapter`.
  - The `constructor` accepts `CloudflareWorkersAdapterConfig`.
  - The `execute(job: WorkerJob)` method:
    - Validates the presence of `job.meta?.chunkId`.
    - Determines `jobDefUrl` from `this.config.jobDefUrl` or `job.meta?.jobDefUrl`.
    - Constructs the JSON payload: `{ jobPath: jobDefUrl, chunkIndex: job.meta.chunkId }`.
    - Sets up headers: `Content-Type: application/json`. If `this.config.authToken` is present, append an authentication header.
    - Uses native `fetch` to POST the payload to `this.config.serviceUrl`. It passes `job.signal` to the `fetch` call for abort support.
    - Parses the response. Expects a JSON object containing `{ exitCode, stdout, stderr }` or handles plain text/error responses appropriately.
    - Maps HTTP status codes to exit codes (e.g., non-200 results in `exitCode: 1` and populated `stderr`).
    - Returns a `WorkerResult` object including `durationMs`.
    - Includes a `try/catch` block to handle network errors and aborted requests gracefully, ensuring they return a failed `WorkerResult` rather than throwing uncaught exceptions.
- **Public API Changes**:
  - Export `CloudflareWorkersAdapter` and `CloudflareWorkersAdapterConfig` from `src/adapters/cloudflare-workers-adapter.ts`.
  - Add exports to `src/adapters/index.ts`.
- **Dependencies**: None external; utilizes the built-in global `fetch` API.
- **Cloud Considerations**: Adapts to Cloudflare's 128MB memory limit and CPU time constraints by ensuring the interface adheres strictly to the existing lightweight worker payload pattern.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test -- tests/adapters/cloudflare-workers-adapter.test.ts && npm run bench -- tests/benchmarks/cloudflare-workers-adapter.bench.ts --run`
- **Success Criteria**: All unit tests pass, verifying successful HTTP POST requests, correct payload construction, authentication header inclusion, error handling for non-200 responses, and abort signal propagation. The benchmark executes successfully without errors.
- **Edge Cases**: Network timeouts/unreachable service URL, HTTP 401/403 (auth errors), HTTP 500 (internal server errors), invalid JSON responses from the worker, and job cancellation via `AbortSignal`.
- **Integration Verification**: The example script runs and demonstrates a simulated successful execution against a mock or real endpoint.
