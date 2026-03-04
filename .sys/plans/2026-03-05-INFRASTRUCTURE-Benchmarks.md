#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for core distributed execution components.
- **Trigger**: The INFRASTRUCTURE domain is functionally aligned with the V2 vision (stateless workers, cloud adapters, artifact storage, and governance tooling are all implemented). According to AGENTS.md, "Benchmarks (only if performance is a selling point)" is a permitted fallback action when no feature gaps exist. Distributed rendering performance and orchestrator throughput are key selling points for V2.
- **Impact**: Establishes performance baselines for `JobManager` chunk orchestration and `LocalStorageAdapter` asset IO, enabling data-driven optimizations in the future.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/job-manager.bench.ts` (Vitest benchmarks for `JobManager` orchestration throughput)
- **Create**: `packages/infrastructure/tests/benchmarks/local-storage.bench.ts` (Vitest benchmarks for `LocalStorageAdapter` IO performance)
- **Modify**: `packages/infrastructure/package.json` (Add `"bench": "vitest bench"` script if missing, to standardized benchmark execution)
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-manager.ts`, `packages/infrastructure/src/storage/local-storage.ts`

#### 3. Implementation Spec
- **Architecture**: Utilize `vitest bench` to measure operations/second for critical paths.
- **Pseudo-Code**:
  - `job-manager.bench.ts`: Setup a `JobManager` with a `MemoryJobRepository` and a dummy `WorkerAdapter`. Benchmark `JobManager.runJob` with varying chunk counts (e.g., 100, 1000) to measure orchestration overhead and scheduling throughput.
  - `local-storage.bench.ts`: Benchmark `LocalStorageAdapter.uploadAssetBundle` and `LocalStorageAdapter.downloadAssetBundle` with files of varying sizes (e.g., 1MB, 10MB) to measure local file system IO overhead.
- **Public API Changes**: None.
- **Dependencies**: Vitest is already configured.
- **Cloud Considerations**: Benchmarks will run locally, but the results directly inform the performance characteristics of cloud executions since local IO and orchestration overhead are universal constraints.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure`.
- **Success Criteria**: Vitest outputs benchmark results showing operations/sec (ops/sec) for both the `JobManager` and `LocalStorageAdapter` suites.
- **Edge Cases**: Ensure benchmarks correctly handle file system cleanup to avoid disk space exhaustion during repeated runs.
- **Integration Verification**: Ensure existing tests pass (`npm test -w packages/infrastructure`) and are unaffected by the new benchmark files.
