#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `AzureFunctionsAdapter`.
- **Trigger**: The INFRASTRUCTURE domain is functionally aligned with the V2 vision, and adding performance benchmarks is an allowed fallback action. Benchmarks exist for other cloud adapters but not for the newly added Azure Functions adapter.
- **Impact**: Quantifies the invocation overhead of the Azure Functions adapter during distributed rendering orchestration, ensuring it remains performant.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/azure-functions-adapter.bench.ts`
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/adapters/azure-functions-adapter.ts`
  - `packages/infrastructure/README.md`

#### 3. Implementation Spec
- **Architecture**: The benchmark will use `vitest bench` to measure the execution time of `AzureFunctionsAdapter`. It will use `vi.spyOn(globalThis, 'fetch')` to simulate the HTTP invocation to an Azure Function without incurring actual network I/O overhead. This isolates the overhead of payload serialization, configuration parsing, and error handling.
- **Pseudo-Code**:
  - Define a test suite for `AzureFunctionsAdapter Benchmark`
  - Initialize an `AzureFunctionsAdapter` instance with a mock configuration (e.g., dummy `serviceUrl` and `functionKey`).
  - Define a dummy `WorkerJob` object containing required metadata like `chunkId`.
  - In a `beforeAll` block, use `vi.spyOn` to mock `globalThis.fetch`.
    - Configure the mock to return a resolved Promise with a successful HTTP response object containing dummy JSON data (`{ stdout: 'success', stderr: '', exitCode: 0 }`).
  - In an `afterAll` block, restore all mocks.
  - Define a `bench` task named `execute job chunk via HTTP`.
    - Inside the bench task, await the `adapter.execute(mockJob)` method.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The benchmark focuses strictly on the adapter logic and abstracts away real Azure Functions network latencies.

#### 4. Test Plan
- **Verification**: Use the `run_in_bash_session` tool to execute `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run bench -- tests/benchmarks/azure-functions-adapter.bench.ts --run`
- **Success Criteria**: The benchmark executes successfully without network errors and outputs performance metrics (e.g., ops/sec) for the `AzureFunctionsAdapter.execute` method.
- **Edge Cases**: N/A for benchmarks.
- **Integration Verification**: Ensure the benchmark script runs reliably without timeouts or race conditions in the vitest hot loop.
