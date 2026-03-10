#### 1. Context & Goal
- **Objective**: Implement a `WorkerAdapter` for Azure Functions to support distributed rendering.
- **Trigger**: Vision gap identified in `docs/BACKLOG.md` under "Platform Expansion" -> "Tier 1 — High Impact, Low Friction" for Azure Functions.
- **Impact**: Enables utilizing Azure Functions for stateless rendering tasks, providing a high-performance alternative to existing AWS and GCP adapters, allowing users to leverage Azure infrastructure.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/azure-functions-adapter.ts` (The Azure Functions adapter implementation)
  - `packages/infrastructure/tests/adapters/azure-functions-adapter.test.ts` (Unit tests for the adapter)
  - `packages/infrastructure/tests/benchmarks/azure-functions-adapter.bench.ts` (Performance benchmarks for the adapter)
  - `packages/infrastructure/examples/azure-functions-adapter-example.ts` (Standalone example demonstrating usage)
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts` (Export the new `azure-functions-adapter.ts`)
- **Read-Only**:
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/types/job.ts`

#### 3. Implementation Spec
- **Architecture**: Create `AzureFunctionsAdapter` implementing the `WorkerAdapter` interface. It will use the native `fetch` API to send a POST request to the configured Azure Function HTTP trigger, matching the standard JSON payload structure.
- **Pseudo-Code**:
  - Define `AzureFunctionsAdapterConfig` interface with `functionUrl`, optional `functionKey` (for `x-functions-key` auth), and optional `jobDefUrl`.
  - Create `AzureFunctionsAdapter` class implementing `WorkerAdapter`.
  - The `constructor` accepts `AzureFunctionsAdapterConfig`.
  - The `execute(job: WorkerJob)` method:
    - Validates the presence of `job.meta?.chunkId`.
    - Determines `jobDefUrl` from `this.config.jobDefUrl` or `job.meta?.jobDefUrl`.
    - Constructs the JSON payload: `{ jobPath: jobDefUrl, chunkIndex: job.meta.chunkId }`.
    - Sets up headers: `Content-Type: application/json`. If `this.config.functionKey` is present, append an authentication header (`x-functions-key: ${functionKey}`).
    - Uses native `fetch` to POST the payload to `this.config.functionUrl`. Passes `job.signal` to the `fetch` call for abort support.
    - Parses the response. Expects a JSON object containing `{ exitCode, stdout, stderr }` or parses plain text/error responses mapping to this structure.
    - Maps HTTP status codes to exit codes (e.g., non-200 results in `exitCode: 1` and populated `stderr`).
    - Returns a `WorkerResult` object including `durationMs`.
    - Includes a `try/catch` block to gracefully handle network errors and aborted requests, returning failed `WorkerResult` objects rather than throwing exceptions.
- **Public API Changes**:
  - Export `AzureFunctionsAdapter` and `AzureFunctionsAdapterConfig` from `src/adapters/azure-functions-adapter.ts`.
  - Add exports to `src/adapters/index.ts`.
- **Dependencies**: None external; utilizes built-in `fetch` API.
- **Cloud Considerations**: Adheres to Azure Functions execution lifecycle and HTTP trigger conventions.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test -- tests/adapters/azure-functions-adapter.test.ts && npm run bench -- tests/benchmarks/azure-functions-adapter.bench.ts --run`
- **Success Criteria**: All unit tests pass, verifying successful HTTP POST requests, correct payload construction, authentication header inclusion (`x-functions-key`), error handling for non-200 responses, and abort signal propagation. The benchmark executes successfully without errors.
- **Edge Cases**: Network timeouts/unreachable function URL, HTTP 401/403 (auth errors), HTTP 500 (internal server errors), invalid JSON responses from the function, and job cancellation via `AbortSignal`.
- **Integration Verification**: The example script runs and demonstrates a simulated successful execution against a mock or real endpoint.