#### 1. Context & Goal
- **Objective**: Optimize GcsStorageAdapter file uploads to perform them concurrently instead of sequentially.
- **Trigger**: The GcsStorageAdapter.uploadAssetBundle method currently uploads files sequentially in a for loop, presenting a performance bottleneck for distributed rendering executions, similar to the pre-optimized S3 implementation.
- **Impact**: Using `Promise.all` for GCS file uploads will significantly improve the execution speed of job orchestration, unlocking faster cloud rendering workflows.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/src/storage/gcs-storage.ts`
- **Read-Only**: `packages/infrastructure/README.md`

#### 3. Implementation Spec
- **Architecture**: Update `uploadAssetBundle` in `GcsStorageAdapter` to map the local files to an array of upload promises using `bucket.upload()`, then `await Promise.all()` to execute them concurrently instead of sequentially iterating with a `for...of` loop.
- **Pseudo-Code**:
  ```typescript
  const uploadPromises = files.map(file => {
    const relativePath = path.relative(localDir, file);
    const gcsKey = `${jobId}/${relativePath.split(path.sep).join('/')}`;
    return bucket.upload(file, { destination: gcsKey });
  });
  await Promise.all(uploadPromises);
  ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Ensure error handling remains intact when `Promise.all` rejects.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test` to verify the GCS storage tests pass successfully.
- **Success Criteria**: The existing infrastructure tests complete successfully without failing.
- **Edge Cases**: Empty directories, non-existent directories.
- **Integration Verification**: Ensure all other `ArtifactStorage` tests and packages using infrastructure still pass `npm test`.
