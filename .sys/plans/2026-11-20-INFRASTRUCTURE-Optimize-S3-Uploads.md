#### 1. Context & Goal
- **Objective**: Optimize the `S3StorageAdapter` to use concurrent `Promise.all` for uploading files to S3.
- **Trigger**: Following the optimization pattern implemented in `GcsStorageAdapter` (which was confirmed as verified in my memory: "Verified GcsStorageAdapter.uploadAssetBundle uses concurrent Promise.all for faster distributed file uploads."), `S3StorageAdapter` currently uses a sequential `for...of` loop to upload files one by one. This is slow and limits scalability. We need to upload them concurrently.
- **Impact**: Speeds up the distributed rendering file upload execution for S3, bringing it to parity with GCS and satisfying the expectation of optimal execution in the infrastructure domain.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/src/storage/s3-storage.ts`
- **Read-Only**: The test suite `packages/infrastructure/tests/`

#### 3. Implementation Spec
- **Architecture**: In `S3StorageAdapter.uploadAssetBundle`, convert the sequential `for (const file of files)` loop into an array of Promises that issue `this.client.send(new PutObjectCommand(...))` and `await Promise.all(uploadPromises)`.
- **Pseudo-Code**:
  ```typescript
  const uploadPromises = files.map(async (file) => {
    const relativePath = path.relative(localDir, file);
    const s3Key = `${jobId}/${relativePath.split(path.sep).join('/')}`;

    const fileStream = createReadStream(file);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: fileStream,
    });

    return this.client.send(command);
  });

  await Promise.all(uploadPromises);
  ```
- **Public API Changes**: None. Internal optimization only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test` in infrastructure package.
- **Success Criteria**: All tests for `S3StorageAdapter` must continue to pass seamlessly with the new concurrent logic.
- **Edge Cases**: No network or rate-limiting handling is included; standard AWS SDK behavior handles retries within reason.
- **Integration Verification**: Will work transparently with `JobManager` because the `uploadAssetBundle` signature is strictly unchanged.
