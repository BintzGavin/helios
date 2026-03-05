#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `FileJobRepository` persistence component.
- **Trigger**: `AGENTS.md` permits "Benchmarks (only if performance is a selling point)" as a fallback action when a domain is aligned with the V2 vision, which the `INFRASTRUCTURE` domain currently is.
- **Impact**: Establishes performance baselines for the disk-based orchestrator state persistence, ensuring distributed rendering jobs do not face excessive I/O bottlenecks during high-frequency status updates.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/file-job-repository.bench.ts` (Vitest benchmark suite for `FileJobRepository`)
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/orchestrator/file-job-repository.ts` (To understand options and storage logic), `packages/infrastructure/src/types/job-status.js` (For mocking `JobStatus`)

#### 3. Implementation Spec
- **Architecture**: Create a Vitest bench suite that tests the disk read/write throughput of `FileJobRepository`.
- **Pseudo-Code**:
  - Initialize `FileJobRepository` with a temporary `.tmp` directory to avoid workspace pollution.
  - Create a dummy `JobStatus` representing a typical distributed rendering job with multiple chunks.
  - Define benchmark scenarios (`bench()`):
    - "Save Job Status": Benchmark `repository.saveJob(status)` to measure serialization and disk write speed.
    - "Get Job Status": Benchmark `repository.getJob(id)` to measure deserialization and disk read speed.
  - Use `beforeAll` and `afterAll` hooks outside the benchmark blocks to handle heavy setup (creating the directory) and teardown (removing the directory) to prevent Vitest bench side-effects or disk bloat as documented in `.jules/INFRASTRUCTURE.md`.
- **Public API Changes**: None
- **Dependencies**: The `vitest` dependency and test infrastructure must be properly configured.
- **Cloud Considerations**: While primarily a local persistence mechanism for `JobManager`, ensuring its speed translates directly to lower overhead for simulated local distributed renders.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/file-job-repository.bench.ts --run`
- **Success Criteria**: The command must successfully execute without crashing, and display Vitest benchmark statistics (ops/sec or latency) for each disk I/O scenario.
- **Edge Cases**: Ensure the temporary directory is reliably created before benchmarks begin and fully purged afterward, even if errors occur, to avoid leaking state.
- **Integration Verification**: Not applicable; this is an isolated performance test.
