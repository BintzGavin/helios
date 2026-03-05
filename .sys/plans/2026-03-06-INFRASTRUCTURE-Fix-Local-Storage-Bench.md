#### 1. Context & Goal
- **Objective**: Fix missing directory errors during vitest bench execution for `LocalStorageAdapter`.
- **Trigger**: Benchmarks are failing on `LocalStorageAdapter` tests due to directory not existing errors. This is because vitest benchmark `setup` / `teardown` hooks defined in the bench options run multiple times differently from what we expect, causing race conditions in directory recreation or mysterious teardown logic taking place during the hot loop execution. We will modify the tests to use `beforeAll` and `afterAll` from `vitest` to do the setup once for the whole suite outside the hot loop and options, as requested by memory constraints, preventing these race conditions.
- **Impact**: Enables benchmarking for `LocalStorageAdapter` to successfully run without crashes or missing directory errors.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/benchmarks/local-storage.bench.ts`
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: In `packages/infrastructure/tests/benchmarks/local-storage.bench.ts`, group the tests into `describe('1MB Payload')` and `describe('10MB Payload')` (or similar grouping if needed, but definitely move the logic) and move the `setup` and `teardown` logic out of the `bench` options and into standard `beforeAll` and `afterAll` hooks provided by `vitest`. This ensures that the dummy files and directory are created strictly once before any benchmark iterations start, and are reliably torn down after all iterations are completely finished. The hot loop (the function within `bench()`) must not contain the file creation code.
- **Pseudo-Code**:
  ```typescript
  import { bench, describe, beforeAll, afterAll } from 'vitest';

  // ... inside describe block ...
  describe('1MB Payload', () => {
    beforeAll(async () => {
      await setup1MB();
    });

    afterAll(async () => {
      await teardown1MB();
    });

    bench('LocalStorageAdapter.uploadAssetBundle - 1MB', async () => {
      await adapter1MB.uploadAssetBundle(jobId1MB, localDir1MB);
    }, { time: 500 });
  });
  ```
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `npm run bench -w packages/infrastructure -- tests/benchmarks/local-storage.bench.ts`
- **Success Criteria**: The benchmarks successfully run and no missing directory errors are thrown. We see valid benchmark times without any test crashes.
- **Edge Cases**: None.
- **Integration Verification**: Verified through the isolated vitest benchmark command.