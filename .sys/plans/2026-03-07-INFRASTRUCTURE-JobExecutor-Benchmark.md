#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `JobExecutor` orchestration component.
- **Trigger**: `AGENTS.md` permits "Benchmarks (only if performance is a selling point)" as a fallback action when a domain is aligned with the V2 vision, which the `INFRASTRUCTURE` domain currently is.
- **Impact**: Establishes performance baselines for the core concurrency engine, ensuring distributed rendering orchestrator scales effectively and efficiently as complexity increases.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/job-executor.bench.ts` (Vitest benchmark suite for `JobExecutor`)
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-executor.ts` (To understand options and concurrency logic), `packages/infrastructure/src/types/job-spec.js` (For mocking `JobSpec`)

#### 3. Implementation Spec
- **Architecture**: Create a Vitest bench suite that tests the queueing and concurrency overhead of `JobExecutor`.
- **Pseudo-Code**:
  - Mock a simple `WorkerAdapter` that simulates a fast synchronous execution (e.g., resolving immediately or with a small `setTimeout` to isolate overhead).
  - Create a large dummy `JobSpec` (e.g., 100 or 1000 chunks) where each chunk uses a simple mocked command.
  - Define benchmark scenarios (`bench()`):
    - "Sequential Execution (Concurrency 1)": Execute the job with `{ concurrency: 1, merge: false }`.
    - "Concurrent Execution (Concurrency 10)": Execute the job with `{ concurrency: 10, merge: false }`.
    - "High Concurrency Execution (Concurrency 100)": Execute the job with `{ concurrency: 100, merge: false }`.
  - Use `beforeAll` and `afterAll` blocks for any generic setup or teardown, keeping the `bench` execution lean to accurately measure the orchestrator's event loop overhead and promise resolution speed.
- **Public API Changes**: None
- **Dependencies**: The `vitest` dependency and test infrastructure must be properly configured (already available).
- **Cloud Considerations**: This benchmark isolates the orchestrator logic itself, completely detached from cloud-specific latency, simulating the absolute theoretical maximum throughput of the orchestrator.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/job-executor.bench.ts --run`
- **Success Criteria**: The command must successfully execute without crashing, and display Vitest benchmark statistics (ops/sec or latency) for each concurrency scenario.
- **Edge Cases**: Ensure the mocked adapter reliably resolves and does not cause unhandled promise rejections or timeout hangs during the high-frequency bench loop.
- **Integration Verification**: Not applicable; this is an isolated performance test.