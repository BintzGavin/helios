#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for `RenderExecutor`.
- **Trigger**: Following the "Nothing To Do Protocol" fallback actions, expanding benchmarks improves the performance baseline for V2 infrastructure.
- **Impact**: Provides measurable performance data for the core rendering execution process, identifying any potential bottlenecks in how commands are spawned and tracked within the worker runtime.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/render-executor.bench.ts` - Benchmark script for `RenderExecutor`.
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/worker/render-executor.ts`

#### 3. Implementation Spec
- **Architecture**: A vitest benchmark script that tests the execution throughput and overhead of `RenderExecutor.executeChunk`.
- **Pseudo-Code**:
  - Initialize `RenderExecutor` with a temporary workspace directory.
  - Create dummy `JobSpec` objects representing varied rendering tasks (e.g., fast commands like `echo`, and simulated longer tasks).
  - Use vitest `bench` blocks to measure execution time.
  - Implement heavy setup/teardown logic (like creating the workspace directory) in `beforeAll` and `afterAll` hooks outside the benchmark loop to avoid disk bloat and race conditions.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: `RenderExecutor` is the abstraction running *inside* the cloud worker; measuring its overhead ensures we don't introduce performance regressions that translate to higher cloud execution costs.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/render-executor.bench.ts --run`
- **Success Criteria**: The benchmarks execute successfully and output performance metrics (ops/sec, duration) for `RenderExecutor` operations.
- **Edge Cases**: Ensure the cleanup logic correctly removes the temporary workspace directory even if a benchmark iteration fails.
- **Integration Verification**: None needed beyond benchmark success.
