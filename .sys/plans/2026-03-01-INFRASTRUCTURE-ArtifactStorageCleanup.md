#### 1. Context & Goal
- **Objective**: Add `deleteAssetBundle` to the `ArtifactStorage` interface and implement it in `LocalStorageAdapter`, then integrate it into `JobManager.deleteJob` to ensure remote job assets are cleaned up.
- **Trigger**: Vision gap identified: distributed cloud executions currently leak job assets in remote storage when jobs are deleted via `JobManager.deleteJob`.
- **Impact**: Ensures proper resource cleanup for distributed rendering infrastructure and prevents storage bloat, paving the way for clean, production-ready cloud execution orchestration.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/src/types/storage.ts` (Add `deleteAssetBundle` interface)
  - `packages/infrastructure/src/storage/local-storage.ts` (Implement `deleteAssetBundle` method)
  - `packages/infrastructure/src/orchestrator/job-manager.ts` (Call `deleteAssetBundle` in `deleteJob`)
  - `packages/infrastructure/tests/orchestrator/job-manager.test.ts` (Add tests for cleanup)
  - `packages/infrastructure/tests/storage/local-storage.test.ts` (Add tests for cleanup)
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Extend `ArtifactStorage` to support resource teardown (`deleteAssetBundle`). Update `LocalStorageAdapter` to remove the remote directory (`rm -rf`). Update `JobManager` to delete the job assets via `ArtifactStorage` before deleting the job metadata from the repository.
- **Pseudo-Code**:
  - Update `ArtifactStorage`: `deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void>`
  - Update `LocalStorageAdapter`: Use `fs.rm(remoteDir, { recursive: true, force: true })`
  - Update `JobManager.deleteJob`: `if (this.storage && job.spec.assetsUrl) { await this.storage.deleteAssetBundle(job.id, job.spec.assetsUrl); }`
- **Public API Changes**: Adds `deleteAssetBundle` to `ArtifactStorage` exported type.
- **Dependencies**: None.
- **Cloud Considerations**: Enables future S3/GCS storage adapters to properly delete bucket prefixes/folders upon job deletion.

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/infrastructure`.
- **Success Criteria**:
  - A new unit test in `storage/local-storage.test.ts` should verify that `deleteAssetBundle` removes the directory correctly.
  - A new unit test in `orchestrator/job-manager.test.ts` should verify that `JobManager.deleteJob` invokes the deletion method on the storage adapter and does not throw errors if storage is missing.
- **Edge Cases**: Handles gracefully if `remoteUrl` doesn't exist or is invalid. Handles gracefully if `storage` is undefined in `JobManager`.
- **Integration Verification**: Ensure existing E2E and unit tests for `JobManager` still pass.
