#### 1. Context & Goal
- **Objective**: Fix missing directory errors during vitest bench execution for `S3StorageAdapter` and `GcsStorageAdapter`.
- **Trigger**: Benchmarks are failing on storage tests due to directory not existing errors. This is because vitest benchmark `setup` / `teardown` hooks that are defined in the bench options run multiple times differently from what we expect, or the test creates a single directory which then gets mysteriously deleted or something during the hotloop or teardown. We will modify the tests to use `beforeAll` and `afterAll` from `vitest` to do the setup once for the whole suite outside the hot loop and options, as requested by memory constraints, preventing these race conditions.
- **Impact**: Enables benchmarking to successfully run and calculates actual IO throughput accurately without crashes or ignoring errors.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/benchmarks/s3-storage.bench.ts`
- **Modify**: `packages/infrastructure/tests/benchmarks/gcs-storage.bench.ts`
- **Read-Only**: `packages/infrastructure/tests/benchmarks/local-storage.bench.ts`

#### 3. Implementation Spec
- **Architecture**: In `packages/infrastructure/tests/benchmarks/s3-storage.bench.ts` and `packages/infrastructure/tests/benchmarks/gcs-storage.bench.ts`, move the `setup` and `teardown` functions out of the `bench` options and into standard `beforeAll` and `afterAll` hooks provided by `vitest`. This ensures that the dummy file and directory are created strictly once before any benchmark iterations start, and are reliably torn down after all iterations are completely finished. We must strictly avoid ignoring errors.
- **Pseudo-Code**:
  ```typescript
  import { bench, describe, beforeAll, afterAll } from 'vitest';

  // ... inside describe block ...
  beforeAll(async () => {
    await setup1MB();
  });

  afterAll(async () => {
    await teardown1MB();
  });

  bench('S3StorageAdapter.uploadAssetBundle - 1MB', async () => {
    await adapter1MB.uploadAssetBundle(jobId1MB, localDir1MB);
  }, { time: 500 });
  ```
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `npm run bench -w packages/infrastructure`
- **Success Criteria**: The benchmarks successfully run and no missing directory errors are thrown. We see valid benchmark times rather than artificially fast times caused by ignored exceptions.
- **Edge Cases**: Make sure other benchmarks still run successfully.
- **Integration Verification**: Verified through the isolated vitest command.
