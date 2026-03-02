# 2026-11-14-INFRASTRUCTURE-S3-Artifact-Storage

## 1. Context & Goal
- **Objective**: Implement an `S3StorageAdapter` to handle artifact uploads and downloads using AWS S3.
- **Trigger**: Vision gap: V2 Infrastructure requires distributed rendering for cloud execution. We currently have an `ArtifactStorage` interface and a `LocalStorageAdapter`, but we need a real cloud storage adapter to handle assets for AWS Lambda executions.
- **Impact**: Enables `AwsLambdaAdapter` executions to fetch assets remotely via an S3 bucket instead of relying on local directories, fully decoupling local scheduling from remote stateless worker execution in AWS.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/storage/s3-storage.ts`: The S3 storage adapter implementation.
  - `packages/infrastructure/tests/storage/s3-storage.test.ts`: Tests using `aws-sdk-client-mock`.
- **Modify**:
  - `packages/infrastructure/src/storage/index.ts`: Export the `S3StorageAdapter`.
  - `packages/infrastructure/package.json`: Add `@aws-sdk/client-s3` dependency.
- **Read-Only**:
  - `packages/infrastructure/src/types/storage.ts`

## 3. Implementation Spec
- **Architecture**:
  - Create `S3StorageAdapter` implementing `ArtifactStorage`.
  - Accept bucket name and region in constructor config.
  - `uploadAssetBundle`: Read all files from `localDir` recursively, upload them to `s3://bucket-name/jobId/...` using `@aws-sdk/client-s3` (PutObject), and return the remote URL (e.g. `s3://bucket-name/jobId`).
  - `downloadAssetBundle`: List objects under `s3://bucket-name/jobId`, download them (GetObject), and write them to `targetDir` while maintaining the directory structure.
  - `deleteAssetBundle`: List objects and delete them (DeleteObjects).
- **Pseudo-Code**:
  - `uploadAssetBundle`: `for file in localDir: s3.putObject({ Bucket, Key: jobId + '/' + file, Body })`
  - `downloadAssetBundle`: `objects = s3.listObjectsV2({ Bucket, Prefix: jobId }); for obj in objects: stream = s3.getObject(); writeStream(targetDir + '/' + obj.Key)`
  - `deleteAssetBundle`: `objects = s3.listObjectsV2; s3.deleteObjects({ Bucket, Delete: { Objects: objects.map(Key) } })`
- **Public API Changes**: Exports `S3StorageAdapter`.
- **Dependencies**: Depends on `@aws-sdk/client-s3` which must be added.
- **Cloud Considerations**: Directly integrates AWS S3 for the AWS Lambda worker runtime.

## 4. Test Plan
- **Verification**: Run `npm run test` and `npm run lint` in `packages/infrastructure`.
- **Success Criteria**: Mocked unit tests verify that S3 clients are called correctly with proper paths during upload, download, and delete.
- **Edge Cases**: Empty directories, subdirectories, missing files, S3 API errors.
- **Integration Verification**: Verify the adapter adheres to the `ArtifactStorage` interface.
