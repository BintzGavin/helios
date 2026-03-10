# INFRASTRUCTURE: Fly Machines Adapter

## 1. Context & Goal
- **Objective**: Implement a `FlyMachinesAdapter` that conforms to the `WorkerAdapter` interface for executing rendering chunks on Fly.io Machines.
- **Trigger**: Vision gap - `AGENTS.md` mandates Cloud execution adapters. `docs/BACKLOG.md` specifically lists `Fly.io Machines` as a Tier 1 high-impact adapter for true pay-per-frame execution.
- **Impact**: Enables `packages/infrastructure` to orchestrate rendering jobs directly on Fly.io infrastructure using the Machines API. This is critical for users needing on-demand, cost-effective GPU/CPU scaling.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/fly-machines-adapter.ts`: Implementation of the adapter.
  - `packages/infrastructure/tests/adapters/fly-machines-adapter.test.ts`: Unit tests verifying API calls and lifecycle management.
  - `packages/infrastructure/tests/benchmarks/fly-machines-adapter.bench.ts`: Performance benchmarks for the adapter.
  - `packages/infrastructure/examples/fly-machines-adapter.ts`: Standalone example script demonstrating usage.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts`: Export the new adapter.
- **Read-Only**:
  - `packages/infrastructure/src/types/index.ts`: Read the main type index.
  - `packages/infrastructure/src/types/adapter.ts`: Read `WorkerAdapter` and `WorkerResult` interfaces.
  - `packages/infrastructure/src/types/job.ts`: Read `WorkerJob` interface.

## 3. Implementation Spec
- **Architecture**:
  - The `FlyMachinesAdapter` implements `WorkerAdapter`.
  - It uses the standard native `fetch` API to interact with the Fly Machines REST API.
  - Unlike simple function invocations (Lambda/CloudRun), this adapter must manage the full Machine lifecycle:
    1. Send a `POST` request to create and start a temporary Machine configured with the job payload (`jobDefUrl` and `chunkId`).
    2. Poll the Machine state via `GET` requests until it transitions to a stopped/exited state.
    3. Retrieve the execution output (stdout/stderr/exitCode).
    4. Ensure cleanup by sending a `DELETE` request to remove the Machine.
  - The payload must follow the established pattern (e.g., passing `jobPath` and `chunkIndex`).
- **Pseudo-Code**:
  - Define `FlyMachinesAdapterConfig` interface with `apiToken`, `appName`, `imageRef`, `jobDefUrl`, etc.
  - In `execute(job)`:
    - Validate `chunkId` and `jobDefUrl`.
    - Create Machine: `fetch('https://api.machines.dev/v1/apps/.../machines', { method: 'POST', body: config })`
    - Start polling loop: `fetch('https://api.machines.dev/v1/apps/.../machines/{id}')` until state is `stopped`.
    - Handle `AbortSignal` to trigger premature cleanup if cancelled.
    - Cleanup Machine: `fetch('https://api.machines.dev/v1/apps/.../machines/{id}', { method: 'DELETE' })`
    - Parse output and return `WorkerResult` (with `exitCode`, `stdout`, `stderr`, and `durationMs`).
- **Public API Changes**:
  - Export `FlyMachinesAdapter` and `FlyMachinesAdapterConfig`.
- **Dependencies**: None. Relies on standard `fetch`.
- **Cloud Considerations**: Fly Machines are full VMs with specific lifecycle states (`created`, `started`, `stopped`, `destroyed`). The adapter must robustly handle polling and ensure destroyed state even if execution fails or is aborted.

## 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && npm run lint`
- **Success Criteria**:
  - Adapter correctly sends the sequence of API requests (Create, Poll, Delete) when `execute()` is called.
  - Returns `exitCode`, `stdout`, `stderr`, and `durationMs` conforming to `WorkerResult`.
  - Gracefully handles API errors and cancels polling/cleans up if `job.signal` is aborted.
- **Edge Cases**:
  - Machine fails to start or gets stuck.
  - Polling timeout.
  - Clean up is attempted even if execution throws an internal error.
  - `AbortSignal` is triggered mid-execution.
- **Integration Verification**: Ensure it can be plugged into `JobExecutor` seamlessly.