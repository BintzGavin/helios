#### 1. Context & Goal
- **Objective**: Integrate `ArtifactStorage` into `WorkerRuntime` and update `JobSpec` to support fetching remote job assets before executing rendering chunks.
- **Trigger**: Distributed rendering vision gap identified in the journal where remote execution environments lack the mechanism to fetch required local assets uploaded during job submission.
- **Impact**: Unblocks distributed rendering workflows by decoupling local assets from remote workers, allowing cloud executions to securely acquire necessary dependencies like fonts and models.

#### 2. File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/infrastructure/src/types/job-spec.ts`: Add `id: string` and `assetsUrl?: string` to the `JobSpec` interface.
  - `packages/infrastructure/src/worker/runtime.ts`: Update `WorkerRuntime` config to accept an optional `storage?: ArtifactStorage` and update the `run` method to download assets using `downloadAssetBundle` prior to chunk execution.
- **Read-Only**:
  - `packages/infrastructure/src/types/storage.ts`: For the `ArtifactStorage` interface signature.
  - `packages/infrastructure/src/storage/local-storage.ts`: For reference on adapter implementations.

#### 3. Implementation Spec
- **Architecture**: Injects `ArtifactStorage` as an optional dependency into `WorkerRuntime`. During execution, the runtime dynamically evaluates if the `JobSpec` mandates remote assets and proactively orchestrates their download to the `workspaceDir` before spinning up the `RenderExecutor`.
- **Pseudo-Code**:
  - In `WorkerRuntime` constructor: store the optional `storage` property from `config`.
  - In `run()`: after fetching and validating `jobSpec`, check if `jobSpec.assetsUrl` is truthy.
  - If `jobSpec.assetsUrl` is truthy, verify `this.storage` exists; if not, throw an error.
  - Call `await this.storage.downloadAssetBundle(jobSpec.id, jobSpec.assetsUrl, this.workspaceDir)`.
  - Proceed with `executor.executeChunk(jobSpec, chunkId)`.
- **Public API Changes**:
  - `JobSpec` interface: Add `id: string` and `assetsUrl?: string`.
  - `WorkerRuntime` constructor config: Add `storage?: ArtifactStorage`.
- **Dependencies**: None. This is self-contained within the infrastructure domain.
- **Cloud Considerations**: The design utilizes the `ArtifactStorage` abstraction, ensuring `WorkerRuntime` remains completely agnostic to whether assets are fetched from an AWS S3 bucket, Google Cloud Storage, or local disk mock.

#### 4. Test Plan
- **Verification**: `npm run test` in `packages/infrastructure`
- **Success Criteria**: All existing tests pass. New unit tests for `WorkerRuntime` confirm `storage.downloadAssetBundle` is called with the correct arguments when `assetsUrl` is provided, and that chunk execution proceeds normally.
- **Edge Cases**:
  - Throws an error when `assetsUrl` is provided but no `storage` adapter is configured on the runtime.
  - Handles network or storage adapter errors during download.
- **Integration Verification**: E2E deterministic verification tests should continue passing, demonstrating that the runtime correctly coordinates with the `RenderExecutor`.
