#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `DenoDeployAdapter` for custom cloud environments.
- **Trigger**: The V2 distributed rendering vision requires supporting diverse cloud execution environments. While the `DenoDeployAdapter` exists and is documented in the README, there is no standalone example demonstrating its integration with a mock `WorkerJob`, unlike other cloud adapters (e.g., Vercel, Cloudflare Workers).
- **Impact**: This unlocks clear developer documentation and a verifiable reference implementation for users wanting to deploy Helios workers to Deno Deploy's edge network.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/deno-deploy-adapter-example.ts`: A standalone TypeScript script demonstrating how to initialize and use the `DenoDeployAdapter` with a mock job.
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`: To understand the constructor configuration and required payload structure.

#### 3. Implementation Spec
- **Architecture**: A simple Node.js script that instantiates a `DenoDeployAdapter` with mock configuration (`serviceUrl`, `authToken`) and constructs a mock `WorkerJob` representing a rendering chunk. It then simulates execution by invoking the `execute` method inside a `try/catch` block to handle expected network failures when no endpoint is available.
- **Pseudo-Code**:
  - Import `DenoDeployAdapter` from `../src/adapters/deno-deploy-adapter.js`.
  - Import `WorkerJob` from `../src/types/job.js`.
  - Define an asynchronous `run` function.
  - Instantiate `DenoDeployAdapter` with a mock `serviceUrl` and `authToken`.
  - Create a mock `WorkerJob` object containing required metadata (`jobDefUrl`, `chunkId`).
  - Call `adapter.execute(job)` inside a `try/catch` block.
  - Log the adapter initialization and the job payload to demonstrate the expected structure.
  - Call `run().catch(console.error)`.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: This example simulates the client-side invocation; actual deployment to Deno Deploy requires a server-side handler which is out of scope for this specific example file.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npx tsx examples/deno-deploy-adapter-example.ts`.
- **Success Criteria**: The script executes successfully and logs the adapter instance and the mock job payload, gracefully handling the expected network failure.
- **Edge Cases**: N/A
- **Integration Verification**: N/A
