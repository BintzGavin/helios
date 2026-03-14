#### 1. Context & Goal
- **Objective**: Improve test coverage for `job-manager.ts` and `job-executor.ts`.
- **Trigger**: `docs/BACKLOG.md` status shows the domain is in "Documentation/Maintenance" phase since features are done, but coverage needs improvement. Planners should plan test coverage expansions to hit gravitational equilibrium.
- **Impact**: Increased reliability and stability for the core orchestrator module, hitting 100% statement and branch coverage.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/tests/orchestrator/job-manager.test.ts`
  - `packages/infrastructure/tests/orchestrator/job-executor.test.ts`
- **Read-Only**:
  - `packages/infrastructure/src/orchestrator/job-manager.ts`
  - `packages/infrastructure/src/orchestrator/job-executor.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing test suites for orchestration tools using Vitest.
- **Pseudo-Code**:
  - `job-manager.test.ts`:
    - Add tests for `runJob` internal callbacks: verify the `if (currentJob)` fallback logic inside `onProgress` and `onChunkComplete` if `repository.get(id)` returns undefined after chunk is processed (lines 225, 228).
  - `job-executor.test.ts`:
    - Add test for `JobExecutor.execute` handling `job.mergeCommand` execution: verify `mergeCommand` is executed using the provided `mergeAdapter` and throws an error if `result.exitCode !== 0` (around line 286).
    - Add test for fallback to `this.adapter` if `options.mergeAdapter` is not provided.
    - Add test for `console.warn` when `stitcher` is provided but `outputFile` is missing during `job.mergeCommand` branch (lines 254-255).
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: N/A

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: Coverage report shows 100% statement and branch coverage for `job-manager.ts` and `job-executor.ts`.
- **Edge Cases**: Verifies resilient error catching in `runJob` callbacks if job is deleted concurrently.
- **Integration Verification**: N/A
