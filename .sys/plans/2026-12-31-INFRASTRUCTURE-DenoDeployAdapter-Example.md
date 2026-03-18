#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the usage of `DenoDeployAdapter`.
- **Trigger**: The backlog indicates that the Deno Deploy adapter is fully implemented. However, an example demonstrating its standalone usage (`deno-deploy-adapter-example.ts`) is missing from the `packages/infrastructure/examples/` directory. Providing an example closes the documentation/example gap for this specific adapter.
- **Impact**: Provides developers with a concrete, copy-pasteable example of how to configure and dispatch rendering jobs using the Deno Deploy cloud execution adapter.

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/deno-deploy-adapter-example.ts`
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone TypeScript script in the `examples/` directory. It instantiates the `DenoDeployAdapter` with a dummy configuration (`serviceUrl`, `authToken`) and demonstrates dispatching a mocked `WorkerJob`.
- **Pseudo-Code**:
  - Import `DenoDeployAdapter` and `WorkerJob` from their respective paths.
  - Define a `DenoDeployAdapterConfig` object with `serviceUrl: 'https://my-deno-worker.deno.dev'` and an optional `authToken`.
  - Instantiate the adapter.
  - Construct a mock `WorkerJob` that requires `meta.jobDefUrl` and `meta.chunkId` to satisfy the adapter's input validation constraints.
  - Await `adapter.execute(job)` wrapped in a `try...catch` block.
  - Gracefully handle the `fetch` error that will inevitably occur because the `serviceUrl` is mocked. Log the expected execution flow and the error.
  - Execute the example block.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: The example script will demonstrate the expected payload requirements (specifically `jobDefUrl` and `chunkId` in `job.meta`) necessary for the Deno Edge Worker to function correctly.

#### 4. Test Plan
- **Verification**: Use the `run_in_bash_session` tool to execute `npx tsx packages/infrastructure/examples/deno-deploy-adapter-example.ts`.
- **Success Criteria**: The script runs, successfully constructs the adapter, attempts execution, and cleanly catches the mocked network error without crashing, logging the demonstration steps.
- **Edge Cases**: N/A for example scripts, but it must include the required `meta` fields to avoid throwing validation errors before the fetch attempt.
- **Integration Verification**: Use the `run_in_bash_session` tool to execute `cd packages/infrastructure && npm run lint && npm run test` to verify no workspace errors were introduced.