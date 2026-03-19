# 2026-03-05-INFRASTRUCTURE-TestCoverage

#### 1. Context & Goal
- **Objective**: Improve the test coverage to 100% for `packages/infrastructure/src/orchestrator/job-manager.ts` and `packages/infrastructure/src/orchestrator/file-job-repository.ts`.
- **Trigger**: Backlog coverage requirements and 100% branch/statement expectations for the orchestrator layer.
- **Impact**: Ensures resilient operation when cancelling and pausing non-existent or completed jobs, and robust file repository iteration.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/tests/orchestrator/job-manager.test.ts`: Add test blocks for early exits in `cancelJob` and `pauseJob`, and unhandled errors in `runJob` via mocking to properly trigger catch blocks.
  - `packages/infrastructure/tests/orchestrator/file-job-repository-resiliency.test.ts`: Add tests to simulate files returning `ENOENT` due to race conditions during `list()` or non-JSON extension skips.
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Expand existing Vitest spec files to target uncovered conditionals.
- **Pseudo-Code**:
  - Mock `runJob` rejection for unhandled job errors mapping to console error.
  - Verify `cancelJob` against non-existent/completed IDs.
  - Mock `fs.readFile` with `ENOENT` to verify race condition catches.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: 100% branch, lines, and statement coverage for `job-manager.ts` and `file-job-repository.ts`.
- **Edge Cases**: Already checking for deleted files mid-read (`ENOENT`).
- **Integration Verification**: The orchestrator unit tests run independently without breaking core job management flows.
