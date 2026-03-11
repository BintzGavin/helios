# INFRASTRUCTURE: Modal Cloud Execution Adapter

## 1. Context & Goal
- **Objective**: Implement a `ModalAdapter` that conforms to the `WorkerAdapter` interface for executing rendering chunks on Modal.com.
- **Trigger**: Vision gap - `AGENTS.md` mandates Cloud execution adapters. `docs/BACKLOG.md` lists Modal (Python-native serverless with first-class GPU support) as an expansion adapter.
- **Impact**: Enables `packages/infrastructure` to orchestrate rendering jobs directly on Modal.com's infrastructure, which is ideal for workflows requiring fast spin-up of GPU resources.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/modal-adapter.ts`: Implementation of the adapter.
  - `packages/infrastructure/tests/adapters/modal-adapter.test.ts`: Unit tests verifying API calls and state management.
  - `packages/infrastructure/tests/benchmarks/modal-adapter.bench.ts`: Performance benchmarks for the adapter.
  - `packages/infrastructure/examples/modal-adapter.ts`: Standalone example script demonstrating usage.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts`: Export the new adapter.
- **Read-Only**:
  - `packages/infrastructure/src/types/index.ts`: Read the main type index.
  - `packages/infrastructure/src/types/adapter.ts`: Read `WorkerAdapter` and `WorkerResult` interfaces.
  - `packages/infrastructure/src/types/job.ts`: Read `WorkerJob` interface.

## 3. Implementation Spec
- **Architecture**:
  - The `ModalAdapter` implements `WorkerAdapter`.
  - Interaction with Modal is done via HTTP/REST to a Modal webhook. Given that this is a TypeScript node library running as the orchestrator, HTTP invocation to an exposed Modal web endpoint is the most idiomatic pattern (similar to Lambda or CloudRun).
  - The adapter should send a POST request with the job payload to the configured Modal webhook URL.
  - Modal handles the compute scaling automatically. The webhook function should return a JSON response containing `exitCode`, `stdout`, `stderr`, and `durationMs` to conform to `WorkerResult`.
- **Pseudo-Code**:
  - Define `ModalAdapterConfig` interface with `webhookUrl` and optional `apiToken`.
  - In `execute(job: WorkerJob)`:
    - Extract standard execution properties such as `job.meta?.jobDefUrl` and `job.meta?.chunkIndex`.
    - Construct standard JSON payload containing `jobPath` mapped to `job.meta?.jobDefUrl` and `chunkIndex` mapped to `job.meta?.chunkIndex` (if applicable, though `command` and `args` may also be passed depending on how Modal functions are built, but cloud adapters typically rely on passing the `jobDefUrl`).
    - Make `fetch` POST request to `config.webhookUrl` with headers (including authorization if `apiToken` is provided).
    - Attach `job.signal` to the fetch request options to handle cancellation properly.
    - Parse the response to construct a standard `WorkerResult`.
- **Public API Changes**:
  - Export `ModalAdapter` and `ModalAdapterConfig`.
- **Dependencies**: None. Relies on standard native `fetch`.
- **Cloud Considerations**: Modal webhooks have timeouts, so chunks must be sized appropriately or a polling pattern must be implemented if execution times out. The initial version will assume synchronous HTTP response from the Modal endpoint.

## 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && npm run lint`
- **Success Criteria**:
  - The adapter correctly formulates and sends a POST request with the required job parameters.
  - It successfully parses the returned JSON and resolves with a well-formed `WorkerResult`.
  - `job.signal` correctly aborts the ongoing fetch request.
- **Edge Cases**:
  - Modal webhook returns 500 or timeout.
  - Invalid JSON response.
  - Network disconnection midway through the execution.
- **Integration Verification**: Ensure it plugs seamlessly into `JobExecutor` with a dummy webhook server.
