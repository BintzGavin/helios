#### 1. Context & Goal
- **Objective**: Expand resiliency testing for `WorkerRuntime` to cover scenarios like chunk execution failures and remote storage timeouts.
- **Trigger**: `JobExecutor` has a good suite of resiliency tests, but `WorkerRuntime` only has one test case inside `tests/e2e/resiliency.test.ts`. Expanding test coverage is a valid fallback action per AGENTS.md when the domain is in gravitational equilibrium.
- **Impact**: Increased confidence that the core execution engine of the stateless workers correctly propagates errors back to the orchestrator, preventing hangs or silent failures in distributed rendering jobs.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/tests/e2e/resiliency.test.ts`
  - Add test cases to the `WorkerRuntime Resiliency` describe block.
- **Read-Only**: `packages/infrastructure/src/worker/runtime.ts`

#### 3. Implementation Spec
- **Architecture**: Append new test cases using Vitest's testing framework to an existing file. Use `vi.spyOn` and custom `MockStorage` or network interceptors (via `global.fetch` mock) to simulate edge cases.
- **Pseudo-Code**:
  - Test Case 1: "WorkerRuntime should correctly propagate chunk execution errors."
    - Mock a `RenderExecutor` to fail when `executeChunk` is called.
    - Assert that `runtime.run` throws the exact error.
  - Test Case 2: "WorkerRuntime should gracefully handle remote JobSpec fetch failures."
    - Mock `global.fetch` to reject or return a non-ok response.
    - Assert that `runtime.run` throws a clear error indicating the fetch failed.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: This validates the robustness of the runtime executing inside cloud functions (Lambda, Cloud Run) where network flakiness is common.

#### 4. Test Plan
- **Verification**: `npm test -w packages/infrastructure -- tests/e2e/resiliency.test.ts`
- **Success Criteria**: All tests pass, and error messages align with expectations.
- **Edge Cases**:
  - `fetch` returning a 404 vs a network error.
  - The render executor throwing a synchronous error vs returning a rejected promise.
- **Integration Verification**: Not required, as these are contained e2e/integration tests.