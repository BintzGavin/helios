#### 1. Context & Goal
- **Objective**: Expand test coverage for `packages/infrastructure/src/worker/` to reach 100%.
- **Trigger**: The `worker` module has missing branches in `cloudrun-server.ts` (lines 17-18, 57), `render-executor.ts` (lines 40, 45), and `runtime.ts` (lines 35, 46).
- **Impact**: Ensures reliability of worker adapters and execution runtimes.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/tests/worker/cloudrun-server.test.ts`: Add test cases for fallback port (when `process.env.PORT` is undefined) and catching string exceptions (e.g. `sendJson(res, 500, { message: error.message || String(error) });`).
  - `packages/infrastructure/tests/render-executor.test.ts`: Mock `child_process.spawn` to return a child missing `stdout` and `stderr` to cover those `if` statements.
  - `packages/infrastructure/tests/worker-runtime.test.ts`: Add test cases for catching a primitive thrown instead of an Error object (e.g. `throw new Error(String(error))`).
- **Read-Only**: `packages/infrastructure/src/worker/cloudrun-server.ts`, `packages/infrastructure/src/worker/render-executor.ts`, `packages/infrastructure/src/worker/runtime.ts`

#### 3. Implementation Spec
- **Architecture**: Expand test cases using `vitest` mocking and stubbing logic.
- **Pseudo-Code**:
  - In `cloudrun-server.test.ts`: Add a test that verifies `createCloudRunServer` without passing `port` and with `process.env.PORT` cleared to fall back to `8080`. Add a test where `WorkerRuntime.prototype.run` rejects with a plain string.
  - In `render-executor.test.ts`: Use `vi.mock('node:child_process')` and provide a mock child process that does not have `stdout` or `stderr` defined, or test what happens if `spawn` doesn't provide them, then emit `close`.
  - In `worker-runtime.test.ts`: Use `readFileMock.mockRejectedValue('String throw')` to hit the `throw new Error(String(error))` branch.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Enhances reliability of cloud-run entrypoints.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test -- --coverage | grep -E "src/worker|runtime|render-executor|aws-handler|cloud-run-server|index"`
- **Success Criteria**: 100% test coverage across all worker module files.
- **Edge Cases**: Non-Error objects thrown in promises.
- **Integration Verification**: Ensure existing E2E and resiliency tests pass.
