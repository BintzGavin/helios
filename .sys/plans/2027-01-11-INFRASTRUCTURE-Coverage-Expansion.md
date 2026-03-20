#### 1. Context & Goal
- **Objective**: Expand test coverage for `JobManager` and `JobExecutor` to 100% by addressing remaining uncovered lines.
- **Trigger**: Test coverage gap discovered in `job-executor.ts` (lines 149-153, 242) and `job-manager.ts` (lines 215-218, 257-277) during exploration.
- **Impact**: Full 100% test coverage ensures robustness of orchestrator components.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/job-executor.test.ts` to add missing JobExecutor tests.
- **Modify**: `packages/infrastructure/tests/orchestrator/job-manager.test.ts` to add missing JobManager tests.
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-executor.ts`
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-manager.ts`

#### 3. Implementation Spec
- **Architecture**: N/A - Testing only
- **Pseudo-Code**:
  - Add `AbortError` test in `job-executor.test.ts` where `signal.aborted` is explicitly mocked to be true at the start of a retry loop (lines 149-153). *Note: Checking existing tests shows some AbortError logic exists, but we need to target the exact line 149-153 condition where the start of the while loop checks `options.signal?.aborted` and creates a new error and clears the queue.*
  - Add unknown error test in `job-executor.test.ts` where the adapter's `execute` method rejects with a primitive or non-Error object (line 242). *Note: Similar tests exist, but we need to hit line 242 specifically where `rejected.reason` is not an Error object.*
  - Add tests in `job-manager.test.ts`:
    - Test `onProgress` callback behavior when the job has been deleted from the repository mid-execution (lines 215-218). `repository.get(id)` returning undefined inside `onProgress`. *Note: Partially tested in "should not throw if currentJob is missing...", but we need to hit the exact uncovered lines.*
    - Test `runJob` catch block when job was paused (`job.state === 'paused'`) (lines 257-258).
    - Test `runJob` catch block when `error.name === 'AbortError'` but the job was already deleted from the repository (lines 261-267).
    - Test `runJob` catch block for standard failures when the job still exists (lines 268-272).
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npx vitest run tests/job-executor.test.ts tests/orchestrator/job-manager.test.ts --coverage`
- **Success Criteria**: `job-executor.ts` and `job-manager.ts` report 100% coverage across all metrics.
- **Edge Cases**: Job deleted mid-execution, error objects without a message.
- **Integration Verification**: N/A
