#### 1. Context & Goal
- **Objective**: Implement a `WorkerAdapter` for Modal, enabling distributed rendering execution on their Python-native serverless platform.
- **Trigger**: Tracked in `docs/BACKLOG.md` under Tier 3 Platform Expansion ("Cloud execution adapter (Modal)").
- **Impact**: Enables users to leverage Modal's high-performance serverless infrastructure and first-class GPU support for rendering workflows, expanding Helios's cross-cloud compatibility.

#### 2. File Inventory
- **Create**: `packages/infrastructure/src/adapters/modal-adapter.ts` (The Modal adapter implementation)
- **Create**: `packages/infrastructure/tests/adapters/modal-adapter.test.ts` (Unit tests for the adapter)
- **Create**: `packages/infrastructure/tests/benchmarks/modal-adapter.bench.ts` (Performance benchmarks)
- **Create**: `packages/infrastructure/examples/modal-adapter.ts` (Example usage script)
- **Modify**: `packages/infrastructure/src/adapters/index.ts` (Export the new adapter)
- **Read-Only**: `packages/infrastructure/src/types/adapter.ts` (To ensure correct implementation of `WorkerAdapter`)

#### 3. Implementation Spec
- **Architecture**: The `ModalAdapter` will implement the `WorkerAdapter` interface. It will communicate with a Modal Webhook or App endpoint via standard HTTP requests (`fetch`), similar to how other HTTP-based adapters operate.
- **Pseudo-Code**:
  - `execute(job)`: Validate `job.meta.jobDefUrl` and `job.meta.chunkId`.
  - Construct payload `{ jobPath, chunkIndex }`.
  - Perform `fetch` (POST) to the configured `config.endpointUrl` with optional `config.authToken` in headers.
  - Handle success/failure responses. Parse `exitCode`, `stdout`, and `stderr` from the JSON response.
  - Respect `job.signal` for potential cancellation requests.
- **Public API Changes**: Export a new class `ModalAdapter` and its configuration interface `ModalAdapterConfig`.
- **Dependencies**: No new external dependencies required (uses native `fetch`).
- **Cloud Considerations**: Modal is traditionally Python-native, but this adapter targets a deployed Modal Webhook/FastAPI endpoint that wraps the Helios rendering engine. The adapter assumes the Modal endpoint accepts JSON payloads and returns structured output.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test` to verify the new adapter's unit tests.
- **Success Criteria**:
  - The `ModalAdapter` successfully formats the HTTP request.
  - Returns `WorkerResult` with correct `exitCode`, `stdout`, and `durationMs` on success.
  - Gracefully handles HTTP errors and aborted signals.
- **Edge Cases**: Missing metadata (e.g., `jobDefUrl`), malformed JSON responses, authentication failures, and network timeouts.
- **Integration Verification**: Ensure the exported adapter is compatible with `JobExecutor` orchestration without any orchestrator changes.
