#### 1. Context & Goal
- **Objective**: Expand test coverage for `CloudRunAdapter` and `LocalWorkerAdapter` to 100%.
- **Trigger**: The current infrastructure test suite shows missing coverage for edge cases in `cloudrun-adapter.ts` and `local-adapter.ts`.
- **Impact**: Ensures deterministic error handling and cleanup, aligning with V2 stability goals.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/tests/cloudrun-adapter.test.ts`: Add test for missing `chunkId`.
  - `packages/infrastructure/tests/adapters/local-adapter.test.ts`: Add tests for `stderr` data handling and timeout cancellation during abort.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts`
  - `packages/infrastructure/src/adapters/local-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Unit test expansion targeting specific uncovered lines in adapter implementations.
- **Pseudo-Code**:
  - In `cloudrun-adapter.test.ts`: Call `execute` without `chunkId` and expect it to throw 'CloudRunAdapter requires job.meta.chunkId to be set'.
  - In `local-adapter.test.ts`: Write a test that triggers `child.stderr.emit('data', 'error log')` to verify `stderr` accumulation and `onStderr` callback execution. Write another test that verifies `clearTimeout(timeoutId)` is called when `signal.abort()` is invoked.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `npm run test --workspace packages/infrastructure -- --coverage`
- **Success Criteria**: 100% statement and branch coverage reported for `cloudrun-adapter.ts` and `local-adapter.ts`.
- **Edge Cases**: Verify timeout ID is effectively cleared to prevent dangling handles.
- **Integration Verification**: Ensure all other infrastructure tests continue to pass.
