#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `RenderExecutor` for processing job chunks locally within a stateless worker.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision. According to AGENTS.md, when no feature gaps exist, the agent must focus on allowed fallback actions. "Examples" are an explicitly allowed fallback action.
- **Impact**: Provides a concrete, runnable demonstration of how to configure and utilize the `RenderExecutor` abstraction, improving developer onboarding and showcasing how worker chunk execution is managed locally.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/render-executor.ts` (Example script demonstrating RenderExecutor chunk execution)
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/worker/render-executor.ts`
  - `packages/infrastructure/src/types/index.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script that instantiates a `RenderExecutor` targeting a local workspace directory, sets up a dummy `JobSpec`, and demonstrates executing a specific chunk.
- **Pseudo-Code**:
  - Import `RenderExecutor` and `JobSpec`.
  - Create a temporary directory `outputDir` to act as the workspace.
  - Define a mock `JobSpec` with a single chunk that simulates some work (e.g., writing a file or printing a message using `node -e`).
  - Instantiate `RenderExecutor` with `outputDir` as the workspace directory.
  - Call `executor.executeChunk(jobSpec, chunkId)`.
  - Log the returned `WorkerResult` (exit code, stdout, stderr, duration).
  - Clean up the temporary workspace directory.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: This example uses local execution (`node -e` as a dummy command) to ensure it is easily runnable without actual cloud infrastructure, demonstrating the fundamental worker abstraction.

#### 4. Test Plan
- **Verification**:
  - Execute `npm run lint -w packages/infrastructure`.
  - Execute the script using `npx tsx packages/infrastructure/examples/render-executor.ts` directly.
- **Success Criteria**:
  - The example has no linting errors.
  - The script runs without errors, executes the simulated command, logs the worker result (including stdout and zero exit code), and cleans up successfully.
- **Edge Cases**: Ensure the temporary directory is created properly and cleaned up.
- **Integration Verification**: N/A
