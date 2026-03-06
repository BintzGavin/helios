#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `WorkerRuntime` class.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision and is currently performing fallback actions (Benchmarking). `WorkerRuntime` is a critical core engine for executing job chunks but lacks performance metrics.
- **Impact**: Establishes a baseline for the latency of `WorkerRuntime.run` (specifically fetching/parsing the `JobSpec` and preparing the execution environment) without rendering overhead, helping prevent future performance regressions.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/worker-runtime.bench.ts`: The new vitest benchmark file for `WorkerRuntime`.
- **Modify**:
  - `docs/status/INFRASTRUCTURE.md`: Log the task completion.
  - `docs/PROGRESS-INFRASTRUCTURE.md`: Log the task completion.
- **Read-Only**:
  - `packages/infrastructure/src/worker/runtime.ts`
  - `packages/infrastructure/src/types/job.js`

#### 3. Implementation Spec
- **Architecture**: Create a vitest benchmark suite targeting `WorkerRuntime.run`.
- **Pseudo-Code**:
  - Mock `fs/promises` to intercept `readFile` and return a static dummy `JobSpec` string to eliminate real disk I/O variability for the benchmark.
  - Mock `RenderExecutor` so `executeChunk` simply returns a resolved mock `WorkerResult`, preventing the benchmark from actually invoking the real renderer (which would pollute the measurement).
  - Define `beforeAll` hooks to set up the mocked dependencies.
  - Define a `bench` block:
    - Instantiate `WorkerRuntime` with a dummy workspace directory.
    - `await runtime.run('dummy-path.json', 0)`
  - Crucially, define all heavy setup outside of the `bench` options using standard `beforeAll`/`afterAll` to adhere to vitest benchmarking lessons and avoid disk bloat or race conditions.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: This benchmark focuses on the local parsing and execution flow. Remote asset downloading via `ArtifactStorage` is skipped by omitting `assetsUrl` in the mocked `JobSpec`.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/worker-runtime.bench.ts --run`.
- **Success Criteria**: The benchmark executes successfully without timing out, providing metrics (ops/sec) for `WorkerRuntime.run`.
- **Edge Cases**: None.
- **Integration Verification**: Ensure normal unit tests for `worker-runtime` still pass by running `npm test -w packages/infrastructure`.
