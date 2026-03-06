#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `CloudRunAdapter` to measure its invocation overhead and execution speed.
- **Trigger**: The V2 distributed rendering vision requires scalable cloud executions. Understanding the overhead of invoking Google Cloud Run services is critical to determining the overall performance of distributed rendering. Benchmarking has been consistently added across the infrastructure package for stability and regression detection.
- **Impact**: Provides baseline metrics for Google Cloud Run invocations within the Helios orchestration layer. This ensures that any future changes to the adapter do not introduce performance regressions, which is essential for large-scale distributed rendering jobs.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/cloudrun-adapter.bench.ts` (Performance benchmarks for `CloudRunAdapter` using `vitest bench`).
- **Read-Only**: `packages/infrastructure/src/adapters/cloudrun-adapter.ts` (The implementation to be benchmarked), `packages/infrastructure/src/types/index.js` (Type definitions for worker jobs).

#### 3. Implementation Spec
- **Architecture**: Create a Vitest benchmark suite for the `CloudRunAdapter`. Since it relies on the Google Auth Library (`google-auth-library`), the benchmark should mock the `GoogleAuth` client to isolate the adapter's logic from network latency and external service calls. This accurately measures the overhead of request serialization, command creation, and response parsing.
- **Mocking**:
  - Mock `google-auth-library` using `vi.mock()`.
  - Simulate a successful `request` response with a valid JSON payload containing `{ status: 200, data: { exitCode: 0, stdout: 'Mocked output', stderr: '' } }`.
- **Benchmark Suite Structure**:
  - `describe('CloudRunAdapter Performance')`: The main benchmark suite.
  - Setup: Initialize the mocked `GoogleAuth` client and the `CloudRunAdapter` instance in an outside `beforeAll` hook to avoid Vitest bench setup overhead inside the hot loop.
  - `bench('execute (mocked successful invocation)')`: A benchmark that measures the performance of calling `adapter.execute(job)` with a mock job payload.
- **Cloud Considerations**: The benchmark explicitly mocks the Google Auth SDK and HTTP requests to focus purely on the CPU overhead of the adapter itself, removing variable network constraints from the test.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/cloudrun-adapter.bench.ts --run` to execute the benchmark suite.
- **Success Criteria**: The benchmark completes without errors, and the console output shows the execution metrics (ops/sec, duration).
- **Edge Cases**: The benchmark should cleanly handle the mocked SDK response without timeouts or unexpected failures.
- **Integration Verification**: The new benchmark file does not break the standard test suite when running `npm test -w packages/infrastructure` and `npm run lint -w packages/infrastructure`.