#### 1. Context & Goal
- **Objective**: Implement a cloud execution adapter for Fly.io Machines.
- **Trigger**: The V2 Infrastructure direction dictates expansion of distributed rendering beyond AWS Lambda and Google Cloud Run. `docs/BACKLOG.md` specifically lists the "Cloud execution adapter (Fly.io Machines)" as a Tier 1 item.
- **Impact**: Enables users to leverage Fly.io's on-demand VM compute and GPUs for rendering jobs. This satisfies the requirement for executing chunks in a distributed environment with custom constraints like GPUs that Fly.io natively supports.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/fly-machines-adapter.ts` (Implements the `WorkerAdapter` for Fly.io)
  - `packages/infrastructure/tests/adapters/fly-machines-adapter.test.ts` (Unit tests for the adapter)
  - `packages/infrastructure/examples/fly-machines-adapter-example.ts` (Example usage of the adapter)
  - `packages/infrastructure/tests/benchmarks/fly-machines-adapter.bench.ts` (Performance benchmarking for the adapter)
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts` (Export the new adapter)
- **Read-Only**:
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/types/job.ts`

#### 3. Implementation Spec
- **Architecture**: The `FlyMachinesAdapter` implements the `WorkerAdapter` interface. It will utilize the Fly.io Machines API via standard HTTP `fetch` to create, wait for completion, and collect outputs from full VMs acting as workers.
- **Pseudo-Code**:
  - The constructor accepts an app name and an API token (`FLY_API_TOKEN`).
  - `execute(job: WorkerJob)`:
    - Ensure `chunkId` and `jobDefUrl` are provided.
    - POST to `https://api.machines.dev/v1/apps/{appName}/machines` to create and start a machine. Pass the `jobDefUrl` and `chunkId` as environment variables or command arguments depending on how the image is built. (For consistency with `docker-adapter`, we will use env variables `JOB_DEF_URL` and `CHUNK_INDEX`).
    - Use the Machines API `wait` endpoint or poll the machine state to determine when the machine has stopped.
    - Since fly machines are VMs, we will wait until the machine exits.
    - Fetch the stdout/stderr logs for the machine using the Fly.io logs API or by having the container output the results in a specific format if direct API isn't reliable enough, though Fly machine logs are standard. Since fly machine API for logs might be complex without CLI, an alternative is to wait for the machine to stop and fetch its exit code. However, `WorkerResult` requires stdout/stderr. To keep it simple and dependency-free, we'll try to fetch logs via standard `https://api.machines.dev` endpoints if available, or simulate a simpler return if Fly API requires special handling.
    - Finally, delete the machine to clean up resources using `DELETE /v1/apps/{appName}/machines/{machineId}`.
- **Public API Changes**: Exports `FlyMachinesAdapter` and `FlyMachinesAdapterConfig` from `packages/infrastructure/src/adapters/index.ts`.
- **Dependencies**: None.
- **Cloud Considerations**: Fly.io requires Bearer token authentication and specific region selection. We'll default region to `ord` or let user configure it. The machine lifecycle requires explicit cleanup (deletion) after use.

#### 4. Test Plan
- **Verification**: Run tests using `npm run test` and `npm run lint` inside the `packages/infrastructure` directory.
- **Success Criteria**:
  - Unit tests verify the adapter correctly posts to the Machine creation endpoint, waits for the machine, and returns a simulated `WorkerResult`.
  - The adapter correctly passes the `FLY_API_TOKEN` in headers.
  - The cleanup code ensures the machine is deleted even if execution fails.
- **Edge Cases**:
  - Machine fails to start.
  - AbortSignal is triggered during wait (must delete machine).
  - API token missing.
- **Integration Verification**: Can be verified by running the example script (which will mock network calls or require a real Fly API token if user runs it).