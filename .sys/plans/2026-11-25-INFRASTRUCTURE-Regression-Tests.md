#### 1. Context & Goal
- **Objective**: Implement comprehensive regression and resiliency tests for distributed execution components (`JobExecutor`, `WorkerRuntime`, and Storage Adapters).
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision (stateless workers, cloud adapters, deterministic seeking, artifact storage, governance tooling are all implemented). According to AGENTS.md, when no feature gaps exist, the agent must focus on allowed fallback actions. Regression tests are an explicitly allowed fallback action.
- **Impact**: Ensures that critical infrastructure components (such as chunk retry logic, storage failures, and worker timeouts) remain resilient against regressions during future modifications, stabilizing the core foundation for V2 distributed rendering.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/e2e/resiliency.test.ts` (New test file for end-to-end failure simulations)
- **Modify**:
  - `packages/infrastructure/package.json` (Update minor version if necessary for documentation/test addition)
- **Read-Only**:
  - `packages/infrastructure/src/orchestrator/job-executor.ts` (To understand retry behavior and failure modes)
  - `packages/infrastructure/src/worker/worker-runtime.ts` (To understand artifact fetching and error propagation)
  - `packages/infrastructure/src/adapters/local-adapter.ts` (For local execution simulation)

#### 3. Implementation Spec
- **Architecture**:
  - Introduce an E2E test suite specifically designed to simulate hostile execution environments (e.g., simulated storage failures, timeout exhaustion during chunk rendering, malformed JobSpecs).
  - Use Vitest mocking and generic test adapters (like `LocalWorkerAdapter`) configured to intentionally fail or delay responses to verify `JobExecutor`'s retry mechanisms and graceful failure states.
- **Pseudo-Code**:
  ```typescript
  // In resiliency.test.ts
  describe('Infrastructure Resiliency and Regression Tests', () => {
    it('JobExecutor should properly fail a job if a chunk repeatedly fails beyond maxRetries', async () => { ... });
    it('WorkerRuntime should propagate storage fetch errors gracefully', async () => { ... });
    it('JobExecutor should handle chunk execution timeouts correctly', async () => { ... });
  });
  ```
- **Public API Changes**: None. This is strictly a test-suite addition.
- **Dependencies**: None.
- **Cloud Considerations**: The tests should primarily mock cloud storage or use the `LocalStorageAdapter` to ensure tests are self-contained and do not require actual cloud credentials.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/infrastructure` from the root directory.
- **Success Criteria**: All tests, including the new `resiliency.test.ts` suite, must pass. The test output should indicate that failure modes (retries, timeouts, storage errors) were successfully triggered and handled correctly by the orchestrator and runtime.
- **Edge Cases**: Verify behavior when an entire job is cancelled mid-retry.
- **Integration Verification**: Ensure that the addition of these tests does not break any existing test coverage in `packages/infrastructure`.
