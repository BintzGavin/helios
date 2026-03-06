#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `LocalWorkerAdapter` to measure its invocation overhead and execution speed.
- **Trigger**: The V2 distributed rendering vision requires scalable executions. Understanding the overhead of invoking local worker processes is critical to determining the overall performance of local simulated distributed rendering. Benchmarking has been consistently added across the infrastructure package for stability and regression detection.
- **Impact**: Provides baseline metrics for local process invocations within the Helios orchestration layer. This ensures that any future changes to the adapter do not introduce performance regressions, which is essential for rendering jobs.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/local-adapter.bench.ts` (Performance benchmarks for `LocalWorkerAdapter` using `vitest bench`).
- **Read-Only**: `packages/infrastructure/src/adapters/local-adapter.ts` (The implementation to be benchmarked), `packages/infrastructure/src/types/index.ts` (Type definitions for worker jobs).

#### 3. Implementation Spec
- **Architecture**: Create a Vitest benchmark suite for the `LocalWorkerAdapter`. The benchmark should measure the overhead of `spawn` and process execution. It will use a fast shell command (like `echo` or `node -e "console.log('done')"`) to minimize the execution time of the child process itself, focusing instead on the adapter's orchestration logic.
- **Benchmark Suite Structure**:
  - `describe('LocalWorkerAdapter Performance')`: The main benchmark suite.
  - Setup: Initialize the `LocalWorkerAdapter` instance.
  - `bench('execute (fast process)')`: A benchmark that measures the performance of calling `adapter.execute(job)` with a job that runs a simple, fast command.
  - `bench('execute (with timeout)')`: A benchmark that measures the performance of calling `adapter.execute(job)` where the job includes a timeout parameter.
- **Node.js Considerations**: The benchmark exercises real `child_process.spawn` calls. Care must be taken to ensure the mocked/dummy commands exit cleanly to avoid zombie processes.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/local-adapter.bench.ts --run` to execute the benchmark suite.
- **Success Criteria**: The benchmark completes without errors, and the console output shows the execution metrics (ops/sec, duration).
- **Edge Cases**: Ensure no zombie processes are left behind after the benchmark suite finishes.
- **Integration Verification**: The new benchmark file does not break the standard test suite when running `npm test -w packages/infrastructure` and `npm run lint -w packages/infrastructure`.