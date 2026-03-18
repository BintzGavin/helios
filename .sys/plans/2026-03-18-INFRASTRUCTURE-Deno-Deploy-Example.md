#### 1. Context & Goal
- **Objective**: Add an example script for the `DenoDeployAdapter`.
- **Trigger**: The `DenoDeployAdapter` is implemented in the codebase but lacks a corresponding usage example in the `examples/` directory.
- **Impact**: Demonstrates how to configure and execute distributed rendering jobs on Deno Deploy's edge platform.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/deno-deploy-adapter.ts`: Example script demonstrating how to use `DenoDeployAdapter`.
- **Modify**:
  - `docs/status/INFRASTRUCTURE.md`: Update status with the completion of the Deno Deploy example.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`: To understand the API and required parameters (`serviceUrl`, `authToken`, `jobDefUrl`, `chunkId`).

#### 3. Implementation Spec
- **Architecture**: Provide a standalone CLI-style example script demonstrating how to instantiate and use `DenoDeployAdapter` to execute a worker job.
- **Pseudo-Code**:
  - Initialize `DenoDeployAdapter` with `serviceUrl` and `authToken` from environment variables.
  - Create a dummy `WorkerJob` payload with `job.meta.jobDefUrl` and `job.meta.chunkId`.
  - Call `execute(job)`.
  - Log stdout, stderr, and the final result.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Notes how environment variables configure the adapter for Deno Deploy endpoints.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run lint && npm run test` to ensure the project still builds and tests pass.
- **Success Criteria**: The example file is created, cleanly handles API responses based on existing implementation, and tests pass.
- **Edge Cases**: Handles missing environment variables gracefully (falling back to a dummy URL).
- **Integration Verification**: Ensure the structure matches other examples (like `modal-adapter.ts`).