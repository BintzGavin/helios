#### 1. Context & Goal
- **Objective**: Improve test coverage for the `JobStatus` types and `InMemoryJobRepository` in the Infrastructure package.
- **Trigger**: Following the 'Gravitational Equilibrium' principle, when there are no explicitly documented vision gaps or backlog items, the agent must focus on allowed fallback actions such as improving test coverage. Running `vitest --coverage` in `packages/infrastructure` reveals that `src/types/job-status.ts` has low coverage (85.71% statements, 50% branches, 80% functions, 83.33% lines).
- **Impact**: Full test coverage for core types and mock repositories ensures stability and reliability of the orchestration system, reducing the likelihood of regressions in job management logic.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/types/job-status.test.ts`: To implement tests for `InMemoryJobRepository` and `JobStatus`.
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/types/job-status.ts`: To understand the target code logic.

#### 3. Implementation Spec
- **Architecture**: Create a standard Vitest suite in `tests/types/job-status.test.ts` to exercise all methods of `InMemoryJobRepository`.
- **Pseudo-Code**:
  - Write a test `should save and get a job` that creates an `InMemoryJobRepository`, calls `save(job)`, and verifies `get(job.id)` returns the cloned job object.
  - Write a test `should return undefined for non-existent job` verifying `get('unknown')` returns `undefined`.
  - Write a test `should list all jobs` verifying `list()` returns an array containing all saved jobs.
  - Write a test `should delete a job` verifying `delete(job.id)` correctly removes the job from the repository.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test tests/types/job-status.test.ts -- --coverage`
- **Success Criteria**: The `job-status.ts` file reaches 100% test coverage for statements, branches, functions, and lines.
- **Edge Cases**: Non-existent jobs during fetch, saving and retrieving multiple jobs.
- **Integration Verification**: `cd packages/infrastructure && npm run test` to verify no regressions in other tests.
