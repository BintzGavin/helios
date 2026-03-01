#### 1. Context & Goal
- **Objective**: Implement `deleteAssetBundle` in `ArtifactStorage` and integrate it into `JobManager.deleteJob` to ensure remote job assets are cleaned up.
- **Trigger**: The recent addition of artifact upload via `ArtifactStorage` missed the corresponding cleanup step. When jobs are deleted via `JobManager.deleteJob`, their remote assets are leaked in storage, violating the architectural goal of maintaining a clean distributed execution environment.
- **Impact**: This prevents storage leaks in cloud environments by ensuring the full lifecycle of a job (creation, execution, deletion) properly cleans up its associated assets.

#### 2. File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/infrastructure/src/types/storage.ts`: Add `deleteAssetBundle` to the interface.
  - `packages/infrastructure/src/storage/local-storage.ts`: Implement `deleteAssetBundle` in `LocalStorageAdapter`.
  - `packages/infrastructure/src/orchestrator/job-manager.ts`: Update `deleteJob` to call `storage.deleteAssetBundle` if `storage` and `job.spec.assetsUrl` exist.
  - `packages/infrastructure/tests/job-manager.test.ts`: Add a test verifying `deleteJob` cleans up storage.
- **Read-Only**:
  - `packages/infrastructure/src/types/job-spec.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the `ArtifactStorage` interface to include deletion capabilities (`deleteAssetBundle`). Implement this method in `LocalStorageAdapter` using `node:fs/promises` (`rm` with `recursive: true`). Modify `JobManager.deleteJob(id: string)` to retrieve the job, cancel it if pending/running, then if `this.storage` and `job.spec.assetsUrl` exist, attempt to delete the assets via the storage adapter. Finally, delete the job from the repository.
- **Pseudo-Code**:
  - In `ArtifactStorage`, add `deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void>;`
  - In `LocalStorageAdapter.deleteAssetBundle`, check if `remoteUrl` starts with `local://`, extract the directory, and call `fs.rm(dir, { recursive: true, force: true })`.
  - In `JobManager.deleteJob`, add logic before repository deletion: `if (this.storage && job.spec.assetsUrl) { try { await this.storage.deleteAssetBundle(id, job.spec.assetsUrl); } catch (e) { console.error(e); } }`
- **Public API Changes**: `ArtifactStorage` requires `deleteAssetBundle`.
- **Dependencies**: None.
- **Cloud Considerations**: The deletion interface is cloud-agnostic. Implementers for S3 or GCS will follow the same pattern to clean up objects.

#### 4. Test Plan
- **Verification**: Run `npm test` and `npm run lint` in the `packages/infrastructure` directory.
- **Success Criteria**: All tests pass. `job-manager.test.ts` includes a test where `JobManager.deleteJob` is called on a job with an `assetsUrl`, and it verifies `storage.deleteAssetBundle` was called correctly.
- **Edge Cases**: Verify that if `deleteAssetBundle` throws an error, it is caught and logged, allowing the job to still be deleted from the repository. Ensure it works seamlessly when no `storage` is provided or when the job has no `assetsUrl`.
- **Integration Verification**: Verify that a job deleted using a standard local storage setup actually removes the physical folder.
