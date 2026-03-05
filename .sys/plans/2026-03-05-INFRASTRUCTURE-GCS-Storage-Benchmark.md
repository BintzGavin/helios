#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `GcsStorageAdapter`.
- **Trigger**: The V2 vision allows for fallback actions like benchmarks when no feature gaps exist, and `GcsStorageAdapter` currently lacks performance benchmarks compared to `S3StorageAdapter` and `LocalStorageAdapter`.
- **Impact**: Ensures that `GcsStorageAdapter` can handle expected payload sizes efficiently and allows performance comparison with other storage adapters.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/gcs-storage.bench.ts` (Benchmark test suite for GcsStorageAdapter)
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/storage/gcs-storage.ts`
  - `packages/infrastructure/tests/benchmarks/s3-storage.bench.ts`
  - `packages/infrastructure/package.json`

#### 3. Implementation Spec
- **Architecture**: Create a Vitest benchmark suite specifically for the `GcsStorageAdapter`. Similar to `S3StorageAdapter`, use dummy files of 1MB and 10MB to measure upload times via `uploadAssetBundle`.
- **Pseudo-Code**:
  - Setup dummy file assets of varying sizes (1MB, 10MB) outside the benchmark hot loop.
  - Instantiate `GcsStorageAdapter` with a dummy bucket name.
  - Mock the `@google-cloud/storage` `Storage` class, specifically the `bucket().upload` or `bucket().file().createWriteStream` method. We must ensure the mock consumes/destroys incoming streams to avoid file descriptor leaks in the bench loop.
  - Run the `bench` function for `uploadAssetBundle`.
  - Clean up files after testing.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: The mock should mimic the stream handling of Google Cloud Storage uploads.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure`.
- **Success Criteria**: The Vitest benchmark output shows the performance results for `GcsStorageAdapter` with 1MB and 10MB payloads without any file descriptor leaks or timeouts.
- **Edge Cases**: Ensure cleanup logic safely removes all generated `.tmp` directory files even if an upload bench fails.
- **Integration Verification**: Verify the new benchmark suite successfully executes within the existing infrastructure benchmarks framework.
