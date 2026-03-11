# INFRASTRUCTURE: Deno Deploy Cloud Execution Adapter

## 1. Context & Goal
- **Objective**: Implement a `DenoDeployAdapter` that conforms to the `WorkerAdapter` interface for executing rendering chunks on Deno Deploy.
- **Trigger**: Vision gap - `AGENTS.md` mandates Cloud execution adapters. `docs/BACKLOG.md` lists Deno Deploy (Emerging edge platform with native TS) as an expansion adapter under Tier 3.
- **Impact**: Enables `packages/infrastructure` to orchestrate rendering jobs directly on Deno Deploy's edge network, taking advantage of fast spin-up and native TypeScript support.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`: Implementation of the adapter.
  - `packages/infrastructure/tests/adapters/deno-deploy-adapter.test.ts`: Unit tests verifying API calls and state management.
  - `packages/infrastructure/tests/benchmarks/deno-deploy-adapter.bench.ts`: Performance benchmarks for the adapter.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts`: Export the new adapter.
- **Read-Only**:
  - `packages/infrastructure/src/types/index.ts`: Read the main type index.
  - `packages/infrastructure/src/types/adapter.ts`: Read `WorkerAdapter` and `WorkerResult` interfaces.
  - `packages/infrastructure/src/types/job.ts`: Read `WorkerJob` interface.

## 3. Implementation Spec
- **Architecture**:
  - The `DenoDeployAdapter` implements `WorkerAdapter`.
  - Interaction with Deno Deploy is done via HTTP/REST to a Deno Deploy worker endpoint. Given that this is a TypeScript node library running as the orchestrator, HTTP invocation to an exposed Deno Deploy web endpoint is the most idiomatic pattern (similar to Cloudflare Workers).
  - The adapter should send a POST request with the job payload to the configured Deno Deploy URL.
  - Deno Deploy handles the compute scaling automatically. The worker function should return a JSON response containing `exitCode`, `stdout`, `stderr`, and `durationMs` to conform to `WorkerResult`.
- **Pseudo-Code**:
  - Define `DenoDeployAdapterConfig` interface with `serviceUrl` and optional `authToken`.
  - In `execute(job: WorkerJob)`:
    - Extract standard execution properties such as `job.meta?.jobDefUrl` and `job.meta?.chunkId`.
    - Construct standard JSON payload containing `jobPath` mapped to `job.meta?.jobDefUrl` and `chunkIndex` mapped to `job.meta?.chunkId`.
    - Make `fetch` POST request to `config.serviceUrl` with headers (including authorization if `authToken` is provided).
    - Attach `job.signal` to the fetch request options to handle cancellation properly.
    - Parse the response to construct a standard `WorkerResult`.
- **Public API Changes**:
  - Export `DenoDeployAdapter` and `DenoDeployAdapterConfig`.
- **Dependencies**: None. Relies on standard native `fetch`.
- **Cloud Considerations**: Deno Deploy has CPU and memory limits, so chunks must be sized appropriately. The initial version will assume synchronous HTTP response from the Deno Deploy endpoint.

## 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && npm run lint`
- **Success Criteria**:
  - The adapter correctly formulates and sends a POST request with the required job parameters.
  - It successfully parses the returned JSON and resolves with a well-formed `WorkerResult`.
  - `job.signal` correctly aborts the ongoing fetch request.
- **Edge Cases**:
  - Deno Deploy endpoint returns 500 or timeout.
  - Invalid JSON response.
  - Network disconnection midway through the execution.
- **Integration Verification**: Ensure it plugs seamlessly into `JobExecutor` with a dummy server.