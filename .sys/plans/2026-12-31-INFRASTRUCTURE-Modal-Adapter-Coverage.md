#### 1. Context & Goal
- **Objective**: Improve test coverage for the `ModalAdapter` in the `packages/infrastructure` domain.
- **Trigger**: The domain has reached gravitational equilibrium (all explicit V2 backlog features are implemented and completed), but test coverage needs expansion to ensure resilience.
- **Impact**: Ensures that critical infrastructure logic within the `ModalAdapter` handles edge cases like missing auth tokens and correctly invokes callback hooks (`onStdout`, `onStderr`).

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/tests/adapters/modal-adapter.test.ts` (Add tests to cover missing branches and callback conditions)
- **Read-Only**:
  - `packages/infrastructure/src/adapters/modal-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Enhance the existing `ModalAdapter` unit test suite to exercise missing statement coverage on lines 17, 55, and 58 of `modal-adapter.ts`.
- **Pseudo-Code**:
  - Add a test case configuring `ModalAdapter` to trigger the `onAbort` callback and set `aborted = true` (line 17), then throwing an error to verify `job.onStderr(stderr)` is executed for abort errors.
  - Add a test case passing a `WorkerJob` that includes `onStdout` and `onStderr` callbacks. Mock the fetch response to return a JSON object with `stdout` and `stderr` strings. Assert that the `job.onStdout(result.stdout)` (line 55) and `job.onStderr(result.stderr)` (line 58) are called with the correct data.
  - Add a test case where the fetch throws a generic execution error, and assert that `job.onStderr(stderr)` (line 79) is correctly called with the formatted error message.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Ensure mocked fetch responses accurately simulate the Modal API behavior without real network calls.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: Statement and branch test coverage for `modal-adapter.ts` increases to 100%, covering lines 17, 55, and 58.
- **Edge Cases**: Job abortion calling `onStderr`, network errors calling `onStderr`, and execution output calling `onStdout` and `onStderr`.
- **Integration Verification**: Verify that adding tests does not break any existing tests (`npm test` passes 100%).
