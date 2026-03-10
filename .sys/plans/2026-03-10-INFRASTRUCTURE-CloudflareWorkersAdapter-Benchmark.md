#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `CloudflareWorkersAdapter` using `vitest bench`.
- **Trigger**: The Cloudflare Workers adapter was implemented, but lacks performance benchmarking to measure invocation overhead compared to other adapters.
- **Impact**: Ensures that performance regressions in the Cloudflare Workers adapter are caught early and provides a baseline for comparing cloud adapter overhead.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/adapters/cloudflare-workers-adapter.bench.ts`
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts`, `packages/infrastructure/src/types/adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Use `vitest bench` to measure the overhead of invoking `execute()` on the `CloudflareWorkersAdapter`.
- **Pseudo-Code**:
  - Mock the global `fetch` function to return a simulated successful worker response.
  - Create an instance of `CloudflareWorkersAdapter` with dummy configuration.
  - Define a benchmark using `bench()` that repeatedly calls `adapter.execute(dummyJob)`.
  - Ensure proper asynchronous setup in a `beforeAll` block to avoid race conditions.
- **Public API Changes**: None.
- **Dependencies**: The `CloudflareWorkersAdapter` must be fully implemented.
- **Cloud Considerations**: The benchmark should mock the network request to isolate the adapter's overhead from actual Cloudflare network latency.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run bench -- tests/adapters/cloudflare-workers-adapter.bench.ts --run`
- **Success Criteria**: The benchmark executes successfully and reports performance metrics (ops/sec) for the `CloudflareWorkersAdapter`.
- **Edge Cases**: Ensure the benchmark properly handles mocked rejected promises or network errors if testing error paths.
- **Integration Verification**: The benchmark should run successfully as part of the full suite (`cd packages/infrastructure && npm run bench`).