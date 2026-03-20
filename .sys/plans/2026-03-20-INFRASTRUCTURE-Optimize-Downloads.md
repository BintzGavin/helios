## Context & Goal
- **Objective**: Optimize `GcsStorageAdapter.downloadAssetBundle` and `S3StorageAdapter.downloadAssetBundle` to perform file downloads concurrently using `Promise.all`.
- **Trigger**: The V2 vision mandates distributed rendering suitable for cloud execution. The recent tasks optimized the upload processes to be concurrent using `Promise.all`. However, the download operations in both `GcsStorageAdapter` and `S3StorageAdapter` are still executing sequentially in a `for...of` loop, creating a bottleneck during job execution when workers fetch assets.
- **Impact**: Unlocks faster startup times for cloud rendering workers by downloading job assets in parallel, completing the concurrency optimization for artifact storage.

## File Inventory
- **Create**: []
- **Modify**:
  - `packages/infrastructure/src/storage/gcs-storage.ts`: Refactor `downloadAssetBundle` to accumulate download promises and execute them concurrently via `Promise.all`.
  - `packages/infrastructure/src/storage/s3-storage.ts`: Refactor `downloadAssetBundle` to accumulate download promises and execute them concurrently via `Promise.all`.
- **Read-Only**:
  - `packages/infrastructure/tests/storage/gcs-storage.test.ts`
  - `packages/infrastructure/tests/storage/s3-storage.test.ts`

## Implementation Spec
- **Architecture**: In both cloud storage adapters (`GcsStorageAdapter` and `S3StorageAdapter`), the `downloadAssetBundle` method currently iterates over the discovered files sequentially. We will restructure the loop to map over the files, generating an array of promises for creating the directory and downloading the file, and then await all of them at once using `Promise.all`. For `S3StorageAdapter`, since it uses pagination, we can map the promises per page and await them to ensure we don't hold too much in memory at once while still gaining concurrent speedups.
- **Pseudo-Code**:
  - **gcs-storage.ts**:
    ```typescript
    // Instead of a sequential for loop:
    const downloadPromises = files
      .filter(file => file.name !== `${prefix}/`) // Skip directory
      .map(async (file) => {
        const relativePath = file.name.substring(prefix.length + 1);
        const localFilePath = path.join(targetDir, ...relativePath.split('/'));
        const fileDir = path.dirname(localFilePath);
        await fs.mkdir(fileDir, { recursive: true });
        await file.download({ destination: localFilePath });
      });
    await Promise.all(downloadPromises);
    ```
  - **s3-storage.ts**:
    ```typescript
    // Inside the while (isTruncated) loop:
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      const downloadPromises = listResponse.Contents
        .filter(object => object.Key && object.Key !== `${prefix}/`)
        .map(async (object) => {
          // fileCount++;
          const relativePath = object.Key!.substring(prefix.length + 1);
          const localFilePath = path.join(targetDir, ...relativePath.split('/'));
          const fileDir = path.dirname(localFilePath);
          await fs.mkdir(fileDir, { recursive: true });

          const getCommand = new GetObjectCommand({ Bucket: this.bucket, Key: object.Key });
          const getResponse = await this.client.send(getCommand);

          if (getResponse.Body) {
             const writeStream = createWriteStream(localFilePath);
             await new Promise<void>((resolve, reject) => { /* stream logic */ });
          }
        });
      await Promise.all(downloadPromises);
      fileCount += downloadPromises.length;
    }
    ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: S3 and GCS APIs support concurrent requests.

## Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test` to verify the workspace is stable and the existing tests still pass.
- **Success Criteria**: The tests pass successfully and the code in the `downloadAssetBundle` functions in `gcs-storage.ts` and `s3-storage.ts` uses `Promise.all` instead of a sequential `for...of` loop.
- **Edge Cases**: Empty directories, very large lists of files (S3 handles this with pagination which we'll keep).
- **Integration Verification**: Existing integration tests running adapters.
