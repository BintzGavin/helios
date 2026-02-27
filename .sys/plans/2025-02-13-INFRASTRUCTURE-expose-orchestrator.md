# INFRASTRUCTURE: Expose Orchestrator and Implement Job Manager Tests

## Context & Goal
- **Objective**: Expose the `orchestrator` module in the main entry point and implement comprehensive tests for `JobManager`.
- **Trigger**: The `orchestrator` module is currently not exported in `src/index.ts`, making `JobExecutor` and `JobManager` inaccessible to consumers. Additionally, `JobManager` lacks unit tests.
- **Impact**: Enables external packages (like CLI) to use the orchestration logic and ensures reliability of the job management flow.

## File Inventory
- **Modify**:
  - `packages/infrastructure/src/index.ts`: Export `orchestrator` module.
- **Create**:
  - `packages/infrastructure/tests/job-manager.test.ts`: Unit tests for `JobManager`.

## Implementation Spec

### 1. Public API Changes
- **Export**: `packages/infrastructure/src/index.ts` will now export `* from './orchestrator/index.js'`.

### 2. Test Plan for JobManager
The tests will verify the full lifecycle of a job within `JobManager` using `vitest`:
- **Dependencies**: `JobExecutor` (mocked), `JobRepository` (InMemory).
- **Test Cases**:
  - **`submitJob`**:
    - Should return a valid UUID.
    - Should create a job in `pending` state in the repository.
    - Should trigger background execution (verified via spy on `executor.execute`).
  - **`runJob` (Background Execution)**:
    - Should transition job state to `running`.
    - Should transition job state to `completed` and update progress/chunks on success.
    - Should transition job state to `failed` and record error on failure.
  - **Integration**:
    - Verify data flow between `JobManager`, `JobRepository`, and `JobExecutor`.

## Verification
- Run `npm test` in `packages/infrastructure`.
