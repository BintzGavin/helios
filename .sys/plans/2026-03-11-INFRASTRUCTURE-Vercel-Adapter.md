# INFRASTRUCTURE: Vercel Functions Cloud Execution Adapter

## 1. Context & Goal
- **Objective**: Implement a `VercelAdapter` that conforms to the `WorkerAdapter` interface for executing rendering chunks on Vercel Serverless Functions.
- **Trigger**: Vision gap - `AGENTS.md` mandates Cloud execution adapters. `docs/BACKLOG.md` lists `Vercel Functions` as an expansion adapter under Tier 3.
- **Impact**: Enables `packages/infrastructure` to orchestrate rendering jobs directly on Vercel's infrastructure, unlocking deep integration with the Next.js ecosystem.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/vercel-adapter.ts`: Implementation of the adapter.
  - `packages/infrastructure/tests/adapters/vercel-adapter.test.ts`: Unit tests verifying API calls and state management.
  - `packages/infrastructure/tests/benchmarks/vercel-adapter.bench.ts`: Performance benchmarks for the adapter.
  - `packages/infrastructure/examples/vercel-adapter-example.ts`: Standalone example script demonstrating usage.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts`: Export the new adapter.
- **Read-Only**:
  - `packages/infrastructure/src/types/index.ts`: Read the main type index.
  - `packages/infrastructure/src/types/adapter.ts`: Read `WorkerAdapter` and `WorkerResult` interfaces.
  - `packages/infrastructure/src/types/job.ts`: Read `WorkerJob` interface.

## 3. Implementation Spec
- **Architecture**:
  - The `VercelAdapter` implements `WorkerAdapter`.
  - Interaction with Vercel is done via HTTP/REST to a Vercel serverless function endpoint. Given that this is a TypeScript node library running as the orchestrator, HTTP invocation to an exposed Vercel endpoint is the most idiomatic pattern (similar to Cloudflare Workers or Deno Deploy).
  - The adapter should send a POST request with the job payload to the configured Vercel URL.
  - Vercel handles the compute scaling automatically. The worker function should return a JSON response containing `exitCode`, `stdout`, `stderr`, and `durationMs` to conform to `WorkerResult`.
- **Pseudo-Code**:
  - Define `VercelAdapterConfig` interface with `serviceUrl`, optional `authToken`, and optional `jobDefUrl`.
  - In `execute(job: WorkerJob)`:
    - Validate the presence of `job.meta?.chunkId`.
    - Extract standard execution properties such as `job.meta?.jobDefUrl` (or use `config.jobDefUrl`).
    - Construct standard JSON payload containing `jobPath` mapped to `job.meta?.jobDefUrl` and `chunkIndex` mapped to `job.meta?.chunkId`.
    - Make `fetch` POST request to `config.serviceUrl` with headers `Content-Type: application/json` (including authorization if `authToken` is provided).
    - Attach `job.signal` to the fetch request options to handle cancellation properly via `AbortSignal`.
    - Parse the response to construct a standard `WorkerResult` (`exitCode`, `stdout`, `stderr`, `durationMs`).
    - Map HTTP status codes to exit codes (e.g., non-200 results in `exitCode: 1` and populated `stderr`).
    - Include a `try/catch` block to handle network errors and aborted requests gracefully, ensuring they return a failed `WorkerResult` rather than throwing uncaught exceptions.
- **Public API Changes**:
  - Export `VercelAdapter` and `VercelAdapterConfig`.
- **Dependencies**: None. Relies on standard native `fetch`.
- **Cloud Considerations**: Vercel Functions have a strict timeout (e.g., 10s on free tier, 60s on pro/hobby), so chunks must be sized appropriately. The adapter handles HTTP/REST and relies on the user to configure the Vercel serverless function appropriately to not time out. The initial version will assume synchronous HTTP response from the Vercel endpoint.

## 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && npm run bench -- --run && npm run lint`
- **Success Criteria**:
  - The adapter correctly formulates and sends a POST request with the required job parameters.
  - It successfully parses the returned JSON and resolves with a well-formed `WorkerResult`.
  - `job.signal` correctly aborts the ongoing fetch request.
- **Edge Cases**:
  - Vercel endpoint returns 504 Gateway Timeout or 500 Internal Server Error.
  - Invalid JSON response.
  - Network disconnection midway through the execution.
- **Integration Verification**: Ensure it plugs seamlessly into `JobExecutor` with a dummy HTTP server simulating a Vercel Function.
