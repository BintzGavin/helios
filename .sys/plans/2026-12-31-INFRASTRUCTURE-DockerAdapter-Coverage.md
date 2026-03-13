#### 1. Context & Goal
- **Objective**: Improve test coverage for the `DockerAdapter` to handle edge cases and abort signals.
- **Trigger**: Domain has reached gravitational equilibrium, and `DockerAdapter` has coverage gaps.
- **Impact**: Ensures resilient execution of local distributed rendering by handling aborts correctly.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/adapters/docker-adapter.test.ts` (Add tests to cover abort signals and stdout/stderr callbacks)
- **Read-Only**: `packages/infrastructure/src/adapters/docker-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Add new tests to `docker-adapter.test.ts` to simulate job abortion during execution to cover the `if (job.signal.aborted)` blocks and `onStdout`/`onStderr` callbacks.
- **Pseudo-Code**:
  - Add a test that passes an `AbortSignal` that is already aborted before calling `execute` to trigger `job.signal.aborted` logic, returning early with exit code 1.
  - Add a test that provides `job.onStdout` and `job.onStderr` callbacks to ensure they are triggered when data is emitted from `child.stdout` and `child.stderr`.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Local Docker emulation.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage`
- **Success Criteria**: `DockerAdapter` has >95% test coverage.
- **Edge Cases**: Ensure cleanup of resources (containers) happens even when the process errors.
- **Integration Verification**: Ensure `DockerAdapter` can be instantiated and executed via `JobExecutor` using the CLI or standard scripts.
