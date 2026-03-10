# INFRASTRUCTURE: Kubernetes Adapter

## 1. Context & Goal
- **Objective**: Implement a `KubernetesAdapter` conforming to the `WorkerAdapter` interface for executing rendering chunks as Kubernetes Jobs.
- **Trigger**: Vision gap - `AGENTS.md` mandates Cloud execution adapters. `docs/BACKLOG.md` lists `Kubernetes Job API` as a Tier 2 high-impact adapter for enterprise environments.
- **Impact**: Enables `packages/infrastructure` to orchestrate rendering jobs on Kubernetes clusters, allowing users to leverage their existing K8s infrastructure for scalable distributed rendering.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/kubernetes-adapter.ts`: Implementation of the adapter.
  - `packages/infrastructure/tests/adapters/kubernetes-adapter.test.ts`: Unit tests verifying K8s API interactions.
  - `packages/infrastructure/tests/benchmarks/kubernetes-adapter.bench.ts`: Performance benchmarks.
  - `packages/infrastructure/examples/kubernetes-adapter.ts`: Standalone example script demonstrating usage.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts`: Export the new adapter.
  - `packages/infrastructure/package.json`: Add `@kubernetes/client-node` as a dependency.
- **Read-Only**:
  - `packages/infrastructure/src/types/index.ts`: Read main type index.
  - `packages/infrastructure/src/types/adapter.ts`: Read `WorkerAdapter` and `WorkerResult` interfaces.
  - `packages/infrastructure/src/types/job.ts`: Read `WorkerJob` interface (including `signal` AbortSignal).

## 3. Implementation Spec
- **Architecture**:
  - The `KubernetesAdapter` implements `WorkerAdapter`.
  - It uses the `@kubernetes/client-node` library to interact with the Kubernetes API server.
  - It will create a `Job` resource for each rendering chunk.
  - The adapter must manage the Job lifecycle: create the Job, watch/poll for its completion, fetch logs from the pod for stdout/stderr, and clean up the Job resource.
- **Pseudo-Code**:
  - Define `KubernetesAdapterConfig` interface with `kubeConfig`, `namespace`, `image`, `jobDefUrl`, etc.
  - In `execute(job)`:
    - Validate `chunkId` and `jobDefUrl`.
    - Generate a unique Job name based on the chunk ID.
    - Use `@kubernetes/client-node` to create a `Job` in the target namespace.
    - Poll the Job status or watch for completion (Succeeded or Failed).
    - Handle `AbortSignal` (`job.signal`) to trigger Job deletion if cancelled.
    - Once completed, query the API for the Pod associated with the Job and fetch its logs.
    - Clean up: Delete the Job and its Pods.
    - Parse exit status and logs, returning `WorkerResult`.
- **Public API Changes**:
  - Export `KubernetesAdapter` and `KubernetesAdapterConfig`.
- **Dependencies**: `@kubernetes/client-node`.
- **Cloud Considerations**: Managing K8s Jobs requires handling asynchronous pod scheduling, potential image pull errors, and correctly associating logs from a dynamic pod name back to the job execution result.

## 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && npm run lint`
- **Success Criteria**:
  - Adapter correctly creates, monitors, and cleans up a K8s Job resource.
  - Fetches output logs correctly and maps them to `stdout`/`stderr`.
  - Returns `exitCode`, `stdout`, `stderr`, and `durationMs` conforming to `WorkerResult`.
- **Edge Cases**:
  - Job fails to schedule (e.g., ImagePullBackOff).
  - Log fetching fails.
  - `AbortSignal` is triggered mid-execution.
  - Job crashes internally.
- **Integration Verification**: Ensure it can be plugged into `JobExecutor` seamlessly.
