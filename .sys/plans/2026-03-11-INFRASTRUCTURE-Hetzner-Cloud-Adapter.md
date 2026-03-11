# INFRASTRUCTURE: Hetzner Cloud Adapter

## 1. Context & Goal
- **Objective**: Implement a `HetznerCloudAdapter` conforming to the `WorkerAdapter` interface for executing rendering chunks on Hetzner Cloud VMs.
- **Trigger**: Vision gap - `AGENTS.md` mandates Cloud execution adapters. `docs/BACKLOG.md` specifically lists `Hetzner Cloud` as a Tier 3 high-impact adapter for highly cost-effective compute via API-driven VM provisioning.
- **Impact**: Enables `packages/infrastructure` to orchestrate rendering jobs directly on Hetzner Cloud infrastructure. This offers an extremely cost-effective alternative for heavy compute loads, especially in the EU region.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/hetzner-cloud-adapter.ts`: Implementation of the adapter.
  - `packages/infrastructure/tests/adapters/hetzner-cloud-adapter.test.ts`: Unit tests verifying API interactions.
  - `packages/infrastructure/tests/benchmarks/hetzner-cloud-adapter.bench.ts`: Performance benchmarks.
  - `packages/infrastructure/examples/hetzner-cloud-adapter.ts`: Standalone example script demonstrating usage.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts`: Export the new adapter.
- **Read-Only**:
  - `packages/infrastructure/src/types/job.ts`: Read `WorkerJob` interface.

## 3. Implementation Spec
- **Architecture**:
  - The `HetznerCloudAdapter` implements `WorkerAdapter`.
  - It uses the standard native `fetch` API to interact with the Hetzner Cloud REST API (`https://api.hetzner.cloud/v1/`).
  - Like Fly or Kubernetes, it must manage the full VM lifecycle:
    1. Send a `POST` request to create a Server instance, utilizing Cloud-Init (user-data) to configure the VM, pull the worker image, and start execution using `jobDefUrl` and `chunkId`.
    2. Poll the Server state via `GET` requests until the worker script signals completion or the VM powers off.
    3. Since standard Cloud-Init lacks direct output collection, the implementation may require fetching logs via SSH or designing a callback mechanism. However, for a stateless adapter without complex networking, the simplest approach is polling an external artifact or relying on the worker script to push logs/results before shutdown.
    4. Ensure cleanup by sending a `DELETE` request to remove the Server instance.
- **Pseudo-Code**:
  - Define `HetznerCloudAdapterConfig` interface with `apiToken`, `serverType`, `image`, `sshKeyId`, `jobDefUrl`, etc.
  - In `execute(job)`:
    - Validate `chunkId` and `jobDefUrl`.
    - Construct a Cloud-Init user-data script to run the job and then poweroff.
    - Create Server: `fetch('https://api.hetzner.cloud/v1/servers', { method: 'POST', body: { name, server_type, image, user_data... } })`
    - Start polling loop: wait for the server to be created and then poll its power state or a completion signal.
    - Handle `AbortSignal` to trigger premature cleanup if cancelled.
    - Cleanup Server: `fetch('https://api.hetzner.cloud/v1/servers/{id}', { method: 'DELETE' })`
    - Parse output (if available) and return `WorkerResult` (with `exitCode`, `stdout`, `stderr`, and `durationMs`).
- **Public API Changes**:
  - Export `HetznerCloudAdapter` and `HetznerCloudAdapterConfig`.
- **Dependencies**: None. Relies on standard `fetch`.
- **Cloud Considerations**: VM provisioning takes time (seconds to minutes) compared to serverless. The adapter must handle extended polling intervals. Error handling must ensure VM deletion even if execution fails or is aborted, to prevent runaway costs.

## 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && npm run lint`
- **Success Criteria**:
  - Adapter correctly sends the sequence of API requests (Create, Poll, Delete) when `execute()` is called.
  - Returns `exitCode`, `stdout`, `stderr`, and `durationMs` conforming to `WorkerResult`.
  - Gracefully handles API errors and cancels polling/cleans up if `job.signal` is aborted.
- **Edge Cases**:
  - Server fails to provision.
  - Polling timeout (execution takes too long).
  - Clean up is attempted even if execution throws an internal error.
  - `AbortSignal` is triggered mid-execution.
- **Integration Verification**: Ensure it can be plugged into `JobExecutor` seamlessly.