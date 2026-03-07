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
  - `packages/infrastructure/src/types/index.ts`

#### 3. Implementation Spec
- **Architecture**: N/A (Example script)
- **Pseudo-Code**:
  - Import `JobManager`, `JobExecutor`, `LocalWorkerAdapter`, `InMemoryJobRepository`.
  - Create instances of the adapter, executor, and repository.
  - Instantiate `JobManager` with the repository and executor.
  - Create a mock `JobSpec` with a few chunks (e.g., fast node scripts that simulate rendering).
  - Use `manager.submitJob(spec, options)` to start the job.
  - Periodically poll `manager.getJob(id)` to log progress (using the `progress` property on `JobStatus`).
  - Wait for the job to reach the `completed` state.
  - Output the final job status and metrics (e.g., duration).
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: This example uses local implementations (`LocalWorkerAdapter`, `InMemoryJobRepository`) to ensure it is runnable without cloud credentials, while demonstrating the agnostic orchestration interface.

#### 4. Test Plan
- **Verification**: Execute `npm run lint -w packages/infrastructure`.
- **Success Criteria**: The example has no linting errors and the code accurately reflects the orchestration setup.
- **Edge Cases**: N/A
- **Integration Verification**: N/A
