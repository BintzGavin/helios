#### 1. Context & Goal
- **Objective**: Achieve 100% test coverage for `LocalWorkerAdapter`.
- **Trigger**: The V2 distributed rendering vision requires reliable local execution as a foundation. `LocalWorkerAdapter` currently has a minor coverage gap related to handling missing `child.stderr` streams when spawned processes fail to provide them.
- **Impact**: Ensures the orchestrator reliably processes spawned worker jobs even if unexpected stream configurations arise.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/adapters/local-adapter.test.ts` (Add test coverage)
- **Read-Only**: `packages/infrastructure/src/adapters/local-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Append unit tests using Vitest to `packages/infrastructure/tests/adapters/local-adapter.test.ts`. Use `vi.mock('node:child_process')` to mock `spawn` specifically to test the behavior when `child.stderr` is omitted from the instantiated `EventEmitter`.
- **Pseudo-Code**:
  - Add test: "should gracefully handle missing child.stderr"
  - Within the file, hoist `vi.mock('node:child_process')` to intercept the `spawn` call.
  - Return an object matching the standard `ChildProcess` signature but set `child.stderr = null`.
  - Execute a job via the adapter and assert it handles the execution and exit successfully without throwing a runtime TypeError regarding undefined listeners.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Ensures robust underlying standard Node APIs are handled defensively, paving the way for consistent remote adaptations.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: Vitest output reports 100% line and branch coverage for `src/adapters/local-adapter.ts`.
- **Edge Cases**: Validates that executing logic defensively interacts with potentially absent `stderr` streams.
- **Integration Verification**: Not required.