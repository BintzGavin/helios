#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `JobManager` to manage rendering jobs, state, and orchestration.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision (stateless workers, cloud adapters, artifact storage, governance tooling are all implemented). According to AGENTS.md, when no feature gaps exist, the agent must focus on allowed fallback actions. "Examples" are an explicitly allowed fallback action.
- **Impact**: Provides a concrete, runnable demonstration of how to configure and utilize the top-level `JobManager` orchestration component, improving developer onboarding and showcasing the complete orchestration loop.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/job-manager-standalone.ts` (Example script demonstrating JobManager orchestration)
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/orchestrator/job-manager.ts`
  - `packages/infrastructure/src/orchestrator/job-executor.ts`
  - `packages/infrastructure/src/types/job-status.ts`
  - `packages/infrastructure/src/types/job-spec.ts`

#### 3. Implementation Spec
- **Architecture**: N/A (Example script)
- **Pseudo-Code**:
  - Import `JobManager`, `JobExecutor`, `LocalWorkerAdapter`, `FileJobRepository` from `../src/index.js`.
  - Import `crypto` for UUID generation, `path` and `url` for directory paths.
  - Create instances of `LocalWorkerAdapter`, `JobExecutor`, and `FileJobRepository` using a local `.tmp-job-store` directory.
  - Instantiate `JobManager` with the repository and executor.
  - Create a mock `JobSpec` with a few chunks (e.g., fast node scripts that simulate rendering, like `node -e 'setTimeout(() => console.log(\"mock render\"), 100)'`).
  - Use `manager.submitJob(spec)` to start the job.
  - Implement a polling loop using `setInterval` or a `while` loop that calls `manager.getJob(id)` to log progress (using the `progress` property on `JobStatus`).
  - Wait for the job to reach the `completed` state.
  - Output the final job status and metrics (e.g., duration).
  - Clean up the `.tmp-job-store` directory upon completion.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: This example uses local implementations (`LocalWorkerAdapter`, `FileJobRepository`) to ensure it is runnable without cloud credentials, while demonstrating the agnostic orchestration interface.

#### 4. Test Plan
- **Verification**: Execute `npx tsx packages/infrastructure/examples/job-manager-standalone.ts` and `npm run lint -w packages/infrastructure`.
- **Success Criteria**: The example runs successfully, prints job progress to the console, completes without errors, cleans up the temporary storage directory, and has no linting errors.
- **Edge Cases**: Ensure the polling loop correctly terminates when the job completes or fails, and that resources are cleaned up even if an error occurs.
- **Integration Verification**: N/A
