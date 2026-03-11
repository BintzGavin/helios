#### 1. Context & Goal
- **Objective**: Implement a Kubernetes Job API cloud execution adapter for distributed rendering.
- **Trigger**: The `docs/BACKLOG.md` defines "Cloud execution adapter (Kubernetes Job API)" as an uncompleted vision gap for distributed rendering.
- **Impact**: It allows any Kubernetes cluster to be used as a render farm. This expands the distributed rendering capability of Helios to the enterprise standard orchestration platform.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/kubernetes-adapter.ts` - Implement the Kubernetes Job API adapter.
  - `packages/infrastructure/tests/adapters/kubernetes-adapter.test.ts` - Unit tests for the Kubernetes adapter.
  - `packages/infrastructure/examples/kubernetes-adapter-example.ts` - Example demonstrating usage of the Kubernetes adapter.
  - `packages/infrastructure/tests/benchmarks/kubernetes-adapter.bench.ts` - Vitest benchmark for the Kubernetes adapter.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts` - Export the new adapter.
  - `packages/infrastructure/package.json` - Add `@kubernetes/client-node` as a dependency.
  - `docs/BACKLOG.md` - Mark "Cloud execution adapter (Kubernetes Job API)" as completed.
  - `docs/status/INFRASTRUCTURE.md` - Update status with the new adapter implementation.
- **Read-Only**:
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/types/job.ts`

#### 3. Implementation Spec
- **Architecture**: The `KubernetesAdapter` will implement the `WorkerAdapter` interface. It will create a Kubernetes `Job` resource to execute the rendering process, watch for completion, and read logs to collect the output. It uses `@kubernetes/client-node` for interacting with the Kubernetes API.
- **Pseudo-Code**:
  - Load kubeconfig or in-cluster credentials using `@kubernetes/client-node`.
  - In `execute(job: WorkerJob)`:
    - Generate a unique Job name based on `job.meta?.chunkId` and a random suffix.
    - Construct a job object with the configured container image, `job.command`, `job.args`, and `job.env`.
    - Call the Kubernetes Batch API to create the Job.
    - Set up a watcher/polling mechanism on the Job's status.
    - If `job.signal` triggers an abort, delete the Job in Kubernetes and return an error exit code.
    - Once the Job completes (Succeeded or Failed), fetch the logs from the Pod associated with the Job.
    - Pipe log lines to `job.onStdout` and `job.onStderr` if provided.
    - Parse logs or use them directly as `stdout`/`stderr`.
    - Return a `WorkerResult` containing `exitCode`, `stdout`, and `stderr`.
    - Ensure cleanup (deleting the Job resource) after execution or on error.
- **Public API Changes**:
  - Add `KubernetesAdapter` and `KubernetesAdapterOptions` to exported types in `packages/infrastructure/src/adapters/index.ts`.
- **Dependencies**:
  - Add `@kubernetes/client-node` to `packages/infrastructure/package.json`.
- **Cloud Considerations**:
  - Works on any standard Kubernetes cluster (EKS, GKE, AKS, minikube, etc.).
  - Follows standard Kubernetes pod lifecycle and logging mechanisms.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && npm run lint`
- **Success Criteria**: All unit tests pass, confirming that the adapter creates Kubernetes Jobs with correct configurations, polls status correctly, fetches logs, and handles abort signals/errors appropriately.
- **Edge Cases**:
  - Missing `chunkId` in job metadata.
  - Kubernetes API connection failures.
  - Job pod failing to start.
  - Job execution failing with non-zero exit code.
  - Job timeout or abort signal handling.
- **Integration Verification**: The `KubernetesAdapter` works with `JobExecutor` just like `AwsAdapter` or `LocalAdapter`.