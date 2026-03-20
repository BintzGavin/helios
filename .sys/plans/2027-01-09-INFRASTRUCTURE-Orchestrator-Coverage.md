#### 1. Context & Goal
- **Objective**: Expand test coverage for `JobManager` and `JobExecutor` to 100% by addressing remaining uncovered lines.
- **Trigger**: Test coverage gap discovered in `job-executor.ts` (lines 149-153, 242) and `job-manager.ts` (lines 215-218, 257-277) during exploration.
- **Impact**: Full 100% test coverage ensures robustness of orchestrator components.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/job-executor.test.ts` to add missing JobExecutor tests.
- **Modify**: `packages/infrastructure/tests/orchestrator/job-manager-coverage-expansion.test.ts` to add missing JobManager tests.
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-executor.ts`
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-manager.ts`

#### 3. Implementation Spec
- **Architecture**: N/A - Testing only
- **Pseudo-Code**:
  - Add `AbortError` test in `job-executor.test.ts` where `signal.aborted` is explicitly mocked to be true at the start of a retry loop (lines 149-153).
  - Add unknown error test in `job-executor.test.ts` where the adapter's `execute` method rejects with a primitive or non-Error object (line 242).
  - Add tests in `job-manager-coverage-expansion.test.ts`:
    - Test `onProgress` callback behavior when the job has been deleted from the repository mid-execution (lines 215-218). `repository.get(id)` returning undefined inside `onProgress`.
    - Test `runJob` catch block when job was paused (`job.state === 'paused'`) (lines 257-258).
    - Test `runJob` catch block when `error.name === 'AbortError'` but the job was already deleted from the repository (lines 261-267).
    - Test `runJob` catch block for standard failures when the job still exists (lines 268-272).
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: `job-executor.ts` and `job-manager.ts` report 100% coverage across all metrics.
- **Edge Cases**: Job deleted mid-execution, error objects without a message.
- **Integration Verification**: N/A