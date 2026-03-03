#### 1. Context & Goal
- **Objective**: Implement Google Cloud Storage (GCS) Adapter for ArtifactStorage.
- **Trigger**: The V2 vision requires distributed rendering suitable for cloud execution. While we have `S3StorageAdapter` for AWS and `CloudRunAdapter` for GCP execution, we lack a native GCP storage adapter. To enable true cloud-agnostic end-to-end distributed rendering on Google Cloud (Cloud Run + GCS), a GCS adapter is required.
- **Impact**: Unlocks end-to-end distributed rendering purely on Google Cloud, ensuring cloud-agnostic capabilities and preventing vendor lock-in when using GCP.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/storage/gcs-storage.ts`: The GCS implementation of the `ArtifactStorage` interface.
  - `packages/infrastructure/tests/storage/gcs-storage.test.ts`: Unit tests for the new adapter.
- **Modify**:
  - `packages/infrastructure/src/storage/index.ts`: Export the new `GcsStorageAdapter`.
  - `packages/infrastructure/package.json`: Add `@google-cloud/storage` as a dependency.
- **Read-Only**:
  - `packages/infrastructure/src/types/storage.ts`: For the `ArtifactStorage` interface definition.
  - `packages/infrastructure/src/storage/s3-storage.ts`: As a reference for adapter structure and behavior.

#### 3. Implementation Spec
- **Architecture**:
  - The `GcsStorageAdapter` will implement the `ArtifactStorage` interface to handle uploading, downloading, and deleting job asset bundles.
  - It will use the official `@google-cloud/storage` Node.js SDK.
  - Remote URLs will use the `gcs://` scheme.
  - It will securely handle paths to avoid directory traversal.
- **Pseudo-Code**:
  - Initialize the `Storage` client from `@google-cloud/storage` with the provided `bucket` name and optional configurations in the constructor.
  - `uploadAssetBundle`: Recursively get all files from the local directory. Read each file and upload it to the GCS bucket under a prefix matching the `jobId`. Return the generated `gcs://` URL.
  - `downloadAssetBundle`: Parse the `gcs://` URL to extract the bucket and prefix. List all files with that prefix in the bucket. For each file, ensure the local directory structure exists and download the file contents to the target directory.
  - `deleteAssetBundle`: Parse the `gcs://` URL. List all files under the prefix and delete each one to clean up remote storage.
- **Public API Changes**:
  - Export `GcsStorageAdapter` and its configuration interface `GcsStorageAdapterOptions` from `src/storage/index.ts`.
- **Dependencies**:
  - Requires `@google-cloud/storage` package.
- **Cloud Considerations**:
  - The adapter should rely on standard Google Cloud authentication mechanisms (e.g., Application Default Credentials), which aligns with how the existing `CloudRunAdapter` authenticates.
  - GCS uses a flat namespace with prefixes, similar to S3, which simplifies the logic for listing and deleting.

#### 4. Test Plan
- **Verification**: Run `npm test` inside the `packages/infrastructure/` directory to run the unit tests.
- **Success Criteria**: All tests in `gcs-storage.test.ts` pass, successfully verifying the upload, download, and delete logic, as well as error handling for invalid schemes, missing files, and missing buckets.
- **Edge Cases**:
  - Handling of empty directories during upload/download.
  - Throwing descriptive errors when the local directory doesn't exist during upload.
  - Throwing errors for unsupported URL schemes (e.g., passing `s3://` to the GCS adapter).
  - Throwing errors when the remote directory doesn't exist during download.
- **Integration Verification**: Ensure the `GcsStorageAdapter` can be instantiated and passed as the `storage` configuration to `WorkerRuntime` and `JobManager`.