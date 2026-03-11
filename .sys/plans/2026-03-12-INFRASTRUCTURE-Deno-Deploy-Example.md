#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `DenoDeployAdapter` for executing rendering chunks on Deno Deploy.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium for feature gaps. Following the `AGENTS.md` "Nothing to Do Protocol", fallback actions (Examples) are required. The `DenoDeployAdapter` was implemented but lacks an example script.
- **Impact**: Provides clear documentation and runnable code for users and developers on how to configure and utilize the `DenoDeployAdapter` for distributed rendering on Deno Deploy's edge network.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/deno-deploy-adapter-example.ts` (Example script demonstrating usage of `DenoDeployAdapter`)
- **Modify**: None.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts` (Read to understand the configuration and API of the adapter)
  - `packages/infrastructure/src/types/job.ts` (Read to understand `WorkerJob` and `JobExecutionOptions`)

#### 3. Implementation Spec
- **Architecture**:
  - The script will import `DenoDeployAdapter` from the infrastructure package.
  - It will instantiate the adapter with a placeholder configuration (e.g., `serviceUrl`, `apiToken`, `projectId`).
  - It will define a dummy `WorkerJob` with mock metadata (like `chunkId` and `jobDefUrl`) and dummy callbacks for stdout/stderr streaming.
  - It will call `execute(job)` on the adapter instance within a `try/catch` block.
  - Finally, it will log the `WorkerResult` (or mock error) to the console.
- **Pseudo-Code**:
  - Import `DenoDeployAdapter`.
  - Check for required environment variables (e.g., `DENO_DEPLOY_URL`, `DENO_API_TOKEN`), falling back to dummy values if not present.
  - Create a new instance of `DenoDeployAdapter` using the configuration.
  - Create a `WorkerJob` object:
    - Set `id` to `'example-job-123'`.
    - Set `meta.chunkId` to `1`.
    - Set `meta.jobDefUrl` to `'https://storage.example.com/job.json'`.
    - Add dummy `onStdout` and `onStderr` logging.
  - Await `adapter.execute(job)`.
  - Log the result: `"Adapter execution complete: " + JSON.stringify(result, null, 2)`.
  - Add inline comments explaining that this is a simulated execution requiring a real Deno Deploy endpoint to function correctly.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The example should explicitly document in comments that Deno Deploy functions have specific execution time and memory limits that must be considered when sizing rendering chunks.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npx tsx examples/deno-deploy-adapter-example.ts`
- **Success Criteria**: The script executes, prints a descriptive message about the dummy execution or a simulated output/error if it attempts a real network call to a dummy URL without crashing the Node.js process unexpectedly.
- **Edge Cases**: Missing environment variables should be handled gracefully with dummy fallbacks to ensure the script runs locally without complex setup.
- **Integration Verification**: Run `npm run test` and `npm run lint` in `packages/infrastructure/` to ensure the new example file complies with project standards.