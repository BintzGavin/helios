#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for `WorkerRuntime` to track overhead associated with fetching assets and orchestrating render executions.
- **Trigger**: The Infrastructure domain is incubating and stabilizing V2 features. Ensuring optimal performance for the core worker component (`WorkerRuntime`) is critical to maintaining high throughput in distributed execution pipelines.
- **Impact**: Establishes performance baselines for the `WorkerRuntime`, preventing regressions and enabling future optimization efforts for distributed cloud adapters that depend on it.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/worker-runtime.bench.ts`: The benchmark suite for `WorkerRuntime`.
- **Modify**:
  - None.
- **Read-Only**:
  - `packages/infrastructure/src/worker/runtime.ts`
  - `packages/infrastructure/src/worker/render-executor.ts`
  - `packages/infrastructure/src/storage/local-storage.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Utilize `vitest bench` to measure the performance of the `WorkerRuntime.run` method.
  - Establish two primary benchmark scenarios:
    1. **Local JobSpec Execution**: Benchmark the execution overhead of parsing a local JSON file path and invoking the render execution pipeline without downloading external assets.
    2. **Remote Assets Execution**: Benchmark the execution overhead of fetching an external `JobSpec` and using `ArtifactStorage` (e.g., `LocalStorageAdapter` or a mock) to download job assets before invoking the execution pipeline.
  - Ensure heavy file system setups (like creating mock assets or directories) are relegated to `beforeAll` and `afterAll` hooks to avoid polluting the hot loop, side-effects, or disk bloat as explicitly stated in the memory rules.
- **Pseudo-Code**:
  ```typescript
  import { bench, describe, beforeAll, afterAll } from 'vitest';
  import { WorkerRuntime } from '../../src/worker/runtime.js';
  import { LocalStorageAdapter } from '../../src/storage/local-storage.js';

  describe('WorkerRuntime Benchmarks', () => {
    let workspaceDir: string;
    let storageAdapter: LocalStorageAdapter;
    let runtime: WorkerRuntime;

    beforeAll(async () => {
      // Setup temporary workspace directory and mock assets
      workspaceDir = '.tmp/worker-bench-workspace';
      // ... setup code
      storageAdapter = new LocalStorageAdapter({ baseDir: '.tmp/bench-storage' });
      runtime = new WorkerRuntime({ workspaceDir, storage: storageAdapter });
    });

    afterAll(async () => {
      // Cleanup temporary directories to prevent disk bloat
    });

    bench('run local JobSpec', async () => {
      await runtime.run('path/to/local/job.json', 0);
    });

    bench('run remote JobSpec with assets', async () => {
      await runtime.run('http://mock.url/job.json', 0);
    });
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The benchmarks mock the network request fetching `JobSpec` if needed, to simulate cloud environments fetching remote job specs.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/worker-runtime.bench.ts --run`
- **Success Criteria**: The benchmarks execute successfully without timeout or file system errors, reporting stable performance metrics for both execution scenarios.
- **Edge Cases**: Verify the teardown cleans up all created directories properly, avoiding disk leakage across multiple benchmark runs.
- **Integration Verification**: Ensure `WorkerRuntime` correctly utilizes `LocalStorageAdapter` for benchmark testing.
