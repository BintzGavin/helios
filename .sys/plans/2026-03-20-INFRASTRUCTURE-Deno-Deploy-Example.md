#### 1. Context & Goal
- **Objective**: Add an example script demonstrating how to use the `DenoDeployAdapter` for distributed rendering.
- **Trigger**: The domain has reached gravitational equilibrium. According to AGENTS.md, I must fall back to allowed actions such as "Examples". The Deno Deploy adapter is fully implemented but lacks an example script in `packages/infrastructure/examples/`.
- **Impact**: Provides a concrete, runnable demonstration of how developers can configure and execute rendering jobs on Deno Deploy, fulfilling product surface and knowledge management goals.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/deno-deploy-adapter.ts`
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script that instantiates `DenoDeployAdapter` and uses `JobExecutor` to simulate a distributed rendering job on Deno Deploy.
- **Pseudo-Code**:
  1. Import `DenoDeployAdapter` and `JobExecutor`.
  2. Instantiate `DenoDeployAdapter` with a mock or realistic config (e.g., `serviceUrl: 'https://my-deno-project.deno.dev'`, `authToken: 'secret'`).
  3. Instantiate `JobExecutor` passing the adapter.
  4. Define a sample `WorkerJob` with mock chunks and metadata (e.g., `chunkId: 1`, `jobDefUrl: 'https://example.com/job.json'`).
  5. Call `executor.execute()` and log the progress via `onChunkComplete`.
  6. Catch and log errors, as the mock URL will likely fail but will demonstrate the API structure.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The example should clearly document that users need a deployed Deno Deploy worker route configured to handle POST requests.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npx tsx examples/deno-deploy-adapter.ts`.
- **Success Criteria**: The example runs and correctly sets up the executor flow, logging the configuration and gracefully handling the expected network failure.
- **Edge Cases**: Ensure the script handles network errors clearly to demonstrate failure modes.
- **Integration Verification**: Ensure it imports correctly from the built source.