#### 1. Context & Goal
- **Objective**: Implement a Cloud execution adapter for Cloudflare Workers.
- **Trigger**: Fulfillment of "Tier 1 — High Impact, Low Friction" backlog item for distributed rendering platform expansion.
- **Impact**: Enables running rendering jobs on Cloudflare Workers, providing an alternative to AWS Lambda and Google Cloud Run with very fast cold starts.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts` (The Cloudflare Workers adapter implementation)
  - `packages/infrastructure/tests/adapters/cloudflare-workers-adapter.test.ts` (Test cases for the new adapter)
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts` (Export the new adapter)
- **Read-Only**:
  - `packages/infrastructure/src/types/adapter.ts` (To understand `WorkerAdapter` and `WorkerResult`)
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts` (For reference on how existing adapters are structured)

#### 3. Implementation Spec
- **Architecture**: HTTP POST adapter to trigger a remote Cloudflare Worker for a specific chunk index, waiting for its response and normalizing it to `WorkerResult`.
- **Pseudo-Code**:
  - Define `CloudflareWorkersAdapterConfig` interface with `workerUrl` (string), `apiToken` (optional string), and `jobDefUrl` (optional string).
  - Implement `CloudflareWorkersAdapter` class implementing `WorkerAdapter`.
  - In `execute(job: WorkerJob)`:
    - Validate `job.meta?.chunkId`.
    - Resolve `jobDefUrl` (from config or `job.meta?.jobDefUrl`).
    - Construct POST payload with `{ jobPath: jobDefUrl, chunkIndex: chunkId }`.
    - Prepare headers. Set `Content-Type: application/json`. If `apiToken` is provided, add `Authorization: Bearer <apiToken>`.
    - Use native `fetch` to POST the payload to `workerUrl`.
    - Catch network errors.
    - Parse response as JSON (with error handling). Ensure it returns `exitCode`, `stdout`, `stderr`. Compute `durationMs`.
- **Public API Changes**:
  - Export `CloudflareWorkersAdapter` and `CloudflareWorkersAdapterConfig` from `packages/infrastructure/src/adapters/index.ts`.
- **Dependencies**: None (Uses native `fetch`).
- **Cloud Considerations**: Cloudflare Workers have a 128MB memory limit and CPU time limits.

#### 4. Test Plan
- **Verification**: Run `npm run test -- packages/infrastructure/tests/adapters/cloudflare-workers-adapter.test.ts` from the root directory or inside `packages/infrastructure/`.
- **Success Criteria**: All tests pass. Code coverage is high for the new adapter.
- **Edge Cases**:
  - Missing `chunkId` or `jobDefUrl`.
  - Invalid JSON responses.
  - HTTP error statuses.
  - Network errors during fetch.
- **Integration Verification**: The adapter should conform to `WorkerAdapter` and run successfully in `JobManager`.