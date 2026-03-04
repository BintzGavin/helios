#### 1. Context & Goal
- **Objective**: Fix a dynamic jobspec storage bug where `JobManager` leaks the JSON `JobSpec` configuration on remote environments by implementing `uploadJobSpec` and `deleteJobSpec` and integrating them into the workflow.
- **Trigger**: The agent log states: "Remote cloud workers fail to fetch dynamically updated `JobSpec` configurations because `JobManager` does not persist the updated spec... Plan to add `uploadJobSpec` to `ArtifactStorage` and integrate it into `JobManager.runJob`."
- **Impact**: Ensures that when using stateless execution with remote storage (e.g. S3, GCS, Local Storage Adapter for testing), the cloud worker receives accurate, dynamic `JobSpec` instructions and avoids stranding them post-execution.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/src/orchestrator/job-manager.ts` - Ensure `jobDefUrl` is passed through job meta by using `uploadJobSpec` and `deleteJobSpec`.
- **Modify**: `packages/infrastructure/src/storage/s3-storage.ts` - Add `uploadJobSpec` and `deleteJobSpec` implementations.
- **Modify**: `packages/infrastructure/src/storage/gcs-storage.ts` - Add `uploadJobSpec` and `deleteJobSpec` implementations.
- **Modify**: `packages/infrastructure/tests/job-manager.test.ts` - Add unit tests to cover the JobSpec deletion branch logic.
- **Read-Only**: `packages/infrastructure/src/storage/local-storage.ts` and `packages/infrastructure/src/types/storage.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the storage adapter interface implementations for S3 and GCS to support uploading and deleting `job.json`.
- **S3StorageAdapter**:
  - `uploadJobSpec(jobId, spec)`: `PutObjectCommand` to `${jobId}/job.json` with `JSON.stringify(spec)` as body. Return `s3://${bucket}/${key}`.
  - `deleteJobSpec(jobId, remoteUrl)`: `DeleteObjectCommand` using extracted key from the S3 URL.
- **GcsStorageAdapter**:
  - `uploadJobSpec(jobId, spec)`: `bucket.file('${jobId}/job.json').save(JSON.stringify(spec))`. Return `gs://${bucket}/${key}`.
  - `deleteJobSpec(jobId, remoteUrl)`: `bucket.file(key).delete()`.
- **Public API Changes**: No changes to the interface definitions, only implementation completions in S3 and GCS.
- **Dependencies**: Wait for storage adapters implementation to be completed.
- **Cloud Considerations**: Ensure S3 keys do not begin with `/` and use proper URL format. Same for GCS.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/infrastructure`.
- **Success Criteria**: All unit tests should pass, including new assertions in `job-manager.test.ts`. S3 and GCS tests will be added or updated to cover `uploadJobSpec` and `deleteJobSpec`.
- **Edge Cases**: Malformed remote URLs, missing permissions, missing adapter configurations.
- **Integration Verification**: Verifying the simulated flow in `e2e` and `job-manager` tests using `local-storage.ts`.
