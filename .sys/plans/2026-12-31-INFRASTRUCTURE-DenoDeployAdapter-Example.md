#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `DenoDeployAdapter`.
- **Trigger**: The `DenoDeployAdapter` lacks a standalone example in the `examples/` directory compared to other cloud adapters.
- **Impact**: Provides users with clear, runnable reference material for how to use the `DenoDeployAdapter` to submit jobs to Deno Deploy.

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/deno-deploy-adapter-example.ts`
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone TypeScript script in the `examples/` directory that imports and uses `DenoDeployAdapter` to simulate submitting a job. It will mirror the pattern established by `vercel-adapter-example.ts`, demonstrating adapter initialization with `serviceUrl` and `authToken`, creating a mock `WorkerJob`, and calling `adapter.execute(job)` wrapped in a try/catch.
- **Pseudo-Code**:
  - Import `DenoDeployAdapter` and `WorkerJob`.
  - Create an async `run` function.
  - Initialize the adapter with a mock `serviceUrl` and optional `authToken`.
  - Create a mock `WorkerJob` with basic `command`, `args`, and `meta: { chunkId, jobDefUrl }`.
  - Log execution intent.
  - Wrap `adapter.execute(job)` in a try/catch (since the endpoint is mocked).
  - Catch expected errors if the endpoint is unavailable.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: The example mocks Deno Deploy endpoint usage since no real endpoint is provisioned during the test.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npx tsx examples/deno-deploy-adapter-example.ts`
- **Success Criteria**: The script runs successfully, outputs connection intent, and gracefully catches the expected fetch/network error without unhandled promise rejections.
- **Edge Cases**: None
- **Integration Verification**: Verify the file is created and follows the same format as other examples.
