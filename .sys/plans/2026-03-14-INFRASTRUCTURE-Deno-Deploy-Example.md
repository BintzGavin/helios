#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the use of `DenoDeployAdapter` for distributed rendering execution on Deno Deploy.
- **Trigger**: The Deno Deploy cloud execution adapter was implemented, but it lacks a concrete example script in the `examples/` directory to show developers how to use it.
- **Impact**: Provides clear documentation-by-example for the Deno Deploy integration, enabling developers to adopt the adapter for their rendering infrastructure.

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/deno-deploy-adapter-example.ts` (Example script demonstrating Deno Deploy execution)
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`, `packages/infrastructure/src/types/job.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone TypeScript Node.js script that initializes a `DenoDeployAdapter` with dummy credentials, creates a dummy `WorkerJob`, and logs its configuration before execution to simulate distributed rendering.
- **Pseudo-Code**:
  - Import `DenoDeployAdapter`.
  - Initialize `adapter = new DenoDeployAdapter({ serviceUrl: 'https://my-project.deno.dev', authToken: 'secret' })`.
  - Create a mock `job: WorkerJob` with `meta: { chunkId: 1, jobDefUrl: 's3://...' }`.
  - Print the configured adapter and job to console.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Demonstrates the expected HTTP POST invocation model for Deno Deploy.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/infrastructure/examples/deno-deploy-adapter-example.ts`
- **Success Criteria**: The script executes its initialization logic and logs the setup correctly without throwing runtime errors related to initialization.
- **Edge Cases**: Verify that the dummy credentials are correct TypeScript format.
- **Integration Verification**: Ensure it correctly imports from `../src/adapters/deno-deploy-adapter.js`.
