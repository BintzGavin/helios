#### 1. Context & Goal
- **Objective**: Create unit tests for `GcsStorageAdapter` to ensure stable and correct functionality for uploading, downloading, and deleting remote job assets via Google Cloud Storage.
- **Trigger**: The INFRASTRUCTURE domain is aligned with V2 AGENTS.md requirements, so we must fall back to allowed actions like "Regression tests". Adding test coverage for GCS storage fulfills this.
- **Impact**: Ensures that artifacts managed via GCS are properly uploaded, retrieved, and deleted during cloud worker execution workflows, improving overall stability.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/storage/gcs-storage.test.ts` (Implement test suites)
- **Modify**:
  - None
- **Read-Only**:
  - `packages/infrastructure/src/storage/gcs-storage.ts`
  - `packages/infrastructure/src/types/storage.ts`

#### 3. Implementation Spec
- **Architecture**: Create an automated unit test suite for `GcsStorageAdapter` using vitest, utilizing mocking for `@google-cloud/storage`.
- **Pseudo-Code**:
  - Set up test environment with a temporary directory.
  - Mock `@google-cloud/storage` `Storage`, `Bucket`, and `File` instances.
  - Implement test cases for `uploadAssetBundle`:
    - Ensure it throws if the local directory doesn't exist.
    - Ensure it recursively uploads all files maintaining relative paths.
    - Verify it returns a `gcs://bucket/jobId` URL.
  - Implement test cases for `downloadAssetBundle`:
    - Ensure it validates URL format.
    - Verify it handles missing or empty directories gracefully.
    - Ensure it creates nested directories and downloads files using relative paths.
  - Implement test cases for `deleteAssetBundle`:
    - Verify it correctly issues the `bucket.deleteFiles({ prefix: ... })` command.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: The tests mock out Google Cloud endpoints, so no live GCP resources are needed.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/infrastructure`
- **Success Criteria**: All tests pass, particularly `gcs-storage.test.ts`.
- **Edge Cases**: Empty directories, non-existent paths, invalid GCS URLs, mismatched buckets.
- **Integration Verification**: GCS integration verification is simulated through mocks but logic handles cloud nuances like forward-slashes.