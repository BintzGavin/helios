#### 1. Context & Goal
- **Objective**: Expand test coverage for `JobManager` and `JobExecutor` to 100% by addressing uncovered edge cases.
- **Trigger**: Test coverage gap discovered in `job-executor.ts` (lines 148-152, 242) and `job-manager.ts` (lines 215-218, 257-277) during exploration.
- **Impact**: Full 100% test coverage ensures robustness of orchestrator components.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/job-executor.test.ts` to add missing JobExecutor tests.
- **Modify**: `packages/infrastructure/tests/orchestrator/job-manager.test.ts` to add missing JobManager tests.
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-executor.ts`
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-manager.ts`

#### 3. Implementation Spec
- **Architecture**: Orchestrator test coverage expansion.
- **Pseudo-Code**:
  - Add `AbortError` test in `job-executor.test.ts` where `signal.aborted` is explicitly mocked to be true at the start of a retry loop.
  - Add unknown error test in `job-executor.test.ts` where the adapter's `execute` method rejects with a primitive or non-Error object.
  - Add tests in `job-manager.test.ts`:
    - Test `onProgress` callback behavior when the job has been deleted from the repository mid-execution. `repository.get(id)` returning undefined inside `onProgress`.
    - Test `runJob` catch block when job was paused (`job.state === 'paused'`).
    - Test `runJob` catch block when `error.name === 'AbortError'` but the job was already deleted from the repository.
    - Test `runJob` catch block for standard failures when the job still exists.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npx vitest run tests/job-executor.test.ts tests/orchestrator/job-manager.test.ts --coverage`
- **Success Criteria**: `job-executor.ts` and `job-manager.ts` report 100% coverage across all metrics.
- **Edge Cases**: Job deleted mid-execution, error objects without a message.
- **Integration Verification**: N/A
