#### 1. Context & Goal
- **Objective**: Integrate `ArtifactStorage` into `WorkerRuntime` to download remote job assets before executing rendering chunks.
- **Trigger**: V2 Infrastructure direction requires distributed rendering execution (stateless workers, deterministic frame seeking). Currently, workers have no mechanism to securely download job assets uploaded prior to job execution.
- **Impact**: Unlocks end-to-end distributed rendering execution by decoupling local job creation from remote stateless worker execution. Unblocks cloud worker asset fetching.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/src/types/job-spec.ts` (Add `id` and `assetsUrl` to `JobSpec`)
- **Modify**: `packages/infrastructure/src/worker/runtime.ts` (Inject `ArtifactStorage` and use it to download assets if `assetsUrl` is present)
- **Modify**: `packages/infrastructure/src/worker/aws-handler.ts` (Accept `ArtifactStorage` in configuration and pass to `WorkerRuntime`)
- **Modify**: `packages/infrastructure/src/worker/cloudrun-server.ts` (Accept `ArtifactStorage` in configuration and pass to `WorkerRuntime`)
- **Read-Only**: `packages/infrastructure/src/types/storage.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Enhance `JobSpec` with `id` (string) and `assetsUrl` (optional string) fields to inform the worker of the job's identity and where to fetch remote assets.
  - Update `WorkerRuntime` constructor to optionally accept an `ArtifactStorage` instance.
  - In `WorkerRuntime.run()`, if the fetched `jobSpec` contains an `assetsUrl` and an `ArtifactStorage` instance is configured, invoke `storage.downloadAssetBundle(jobSpec.id, jobSpec.assetsUrl, this.workspaceDir)` before initializing the `RenderExecutor`.
  - Update `createAwsHandler` and `createCloudRunServer` to accept an optional `ArtifactStorage` instance via their configuration interfaces, and inject it into the instantiated `WorkerRuntime`.
- **Pseudo-Code**:
  - `WorkerRuntime`:
    - Inject `ArtifactStorage` in config.
    - Inside `run()`: After fetching `jobSpec`, check `if (jobSpec.assetsUrl && this.storage)`. If so, await `this.storage.downloadAssetBundle(jobSpec.id, jobSpec.assetsUrl, this.workspaceDir)`.
  - `AwsHandlerConfig` & `CloudRunServerConfig`:
    - Add `storage?: ArtifactStorage`.
    - Pass `config.storage` down to `new WorkerRuntime({ workspaceDir, storage: config.storage })`.
- **Public API Changes**:
  - `JobSpec` updated to include `id: string` and `assetsUrl?: string`.
  - `WorkerRuntime`, `createAwsHandler`, and `createCloudRunServer` config objects updated to accept `storage?: ArtifactStorage`.
- **Dependencies**: No cross-domain dependencies. Relies on the previously implemented `ArtifactStorage` interface.
- **Cloud Considerations**: This architecture allows cloud vendor-agnostic artifact fetching (e.g., using a future S3 adapter or GCP adapter) injected at the entrypoint layer.

#### 4. Test Plan
- **Verification**: Run `npm run lint` and `npm run test` inside `packages/infrastructure`. Add or update unit tests for `WorkerRuntime` verifying that `downloadAssetBundle` is called if `assetsUrl` and `storage` are provided.
- **Success Criteria**:
  - `WorkerRuntime` successfully downloads assets when an `assetsUrl` is provided in the `JobSpec` and a storage adapter is configured.
  - Tests pass, demonstrating the `WorkerRuntime` properly awaits the download prior to rendering.
  - Linting passes.
- **Edge Cases**:
  - `assetsUrl` provided but no storage configured (should either throw an error or log a warning, preferring failure for missing capabilities).
  - Storage download fails (should correctly throw/bubble up the error and fail the worker job).
- **Integration Verification**: Ensure the entrypoint servers (AWS/Cloud Run) accept the configuration and propagate it.