#### 1. Context & Goal
- **Objective**: Implement comprehensive regression and resiliency tests for `S3StorageAdapter` and `GcsStorageAdapter` handling `JobSpec` storage operations (`uploadJobSpec` and `deleteJobSpec`).
- **Trigger**: The recent `v0.40.11` release added resiliency tests for `LocalStorageAdapter`, but identical operations (`uploadJobSpec` and `deleteJobSpec`) on cloud storage adapters (`S3StorageAdapter` and `GcsStorageAdapter`) lack comparable resiliency and edge-case verification, creating a gap in testing robustness.
- **Impact**: Ensures that critical job specification upload and delete operations across AWS S3 and Google Cloud Storage handle unexpected inputs gracefully and provide matching robustness as local operations, preventing silent failures during distributed cloud execution orchestration.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/tests/storage/s3-storage.test.ts` (Add tests for `uploadJobSpec` and `deleteJobSpec` covering success, invalid URLs, and error scenarios)
- **Modify**: `packages/infrastructure/tests/storage/gcs-storage.test.ts` (Add tests for `uploadJobSpec` and `deleteJobSpec` covering success, invalid URLs, and error scenarios)
- **Read-Only**: `packages/infrastructure/src/storage/s3-storage.ts`
- **Read-Only**: `packages/infrastructure/src/storage/gcs-storage.ts`
- **Read-Only**: `packages/infrastructure/src/types/job-spec.js` (for type reference)

#### 3. Implementation Spec
- **Architecture**: Expand existing vitest test suites for `S3StorageAdapter` and `GcsStorageAdapter`.
- **Pseudo-Code**:
  - For `s3-storage.test.ts`:
    - Add a `describe('uploadJobSpec')` block containing:
      - Happy path test (`should upload a job spec and return an s3:// URL`).
      - Check that `PutObjectCommand` is called with the correct `Bucket`, `Key` (e.g., `jobId/job.json`), and body.
    - Add a `describe('deleteJobSpec')` block containing:
      - Happy path test (`should delete a job spec`).
      - Check that `DeleteObjectsCommand` is called with the correct `Bucket` and object keys.
      - Edge case test (`should throw an error for unsupported remote URLs on deleteJobSpec`) matching the adapter logic.
      - Edge case test (`should throw an error if mismatched bucket on deleteJobSpec`) matching adapter logic.
  - For `gcs-storage.test.ts`:
    - Add a `describe('uploadJobSpec')` block containing:
      - Happy path test (`should upload a job spec and return a gcs:// URL`).
      - Check that `bucket.file(jobId/job.json)` and `file.save(body)` are invoked.
    - Add a `describe('deleteJobSpec')` block containing:
      - Happy path test (`should delete a job spec`).
      - Check that `bucket.file(jobId/job.json)` and `file.delete()` are invoked.
      - Edge case test (`should throw an error for unsupported remote URLs on deleteJobSpec`) matching the adapter logic.
      - Edge case test (`should throw an error if mismatched bucket on deleteJobSpec`) matching adapter logic.
- **Public API Changes**: No changes to exported modules, only test additions.
- **Dependencies**: No cross-domain dependencies required.
- **Cloud Considerations**: Uses `aws-sdk-client-mock` and existing GCS mock setup to emulate cloud connectivity correctly.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test -- tests/storage/s3-storage.test.ts tests/storage/gcs-storage.test.ts`
- **Success Criteria**: All tests pass indicating full code coverage for `uploadJobSpec` and `deleteJobSpec` operations.
- **Edge Cases**: Must test mismatched buckets during deletion and malformed remote URLs.
- **Integration Verification**: Verify the entire test suite runs perfectly with `npm run test` in `packages/infrastructure`.