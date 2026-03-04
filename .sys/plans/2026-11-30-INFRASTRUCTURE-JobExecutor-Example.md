#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `JobExecutor` for custom orchestration logic.
- **Trigger**: The INFRASTRUCTURE domain is aligned with the V2 vision, and expanding Examples is an allowed fallback action under the "Nothing To Do Protocol" in `AGENTS.md`. Current examples rely on `JobManager` which hides the inner execution engine, but advanced users (or custom orchestrators) may need to use `JobExecutor` directly.
- **Impact**: Provides clear documentation and a reference implementation for executing distributed rendering chunks and merging them without relying on the higher-level `JobManager` orchestrator.

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/job-executor-standalone.ts` (Example script demonstrating `JobExecutor` usage)
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-executor.ts`, `packages/infrastructure/src/adapters/local-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script that instantiates a `LocalWorkerAdapter`, a `FfmpegStitcher`, and a `JobExecutor` to manually execute a `WorkerJob` and coordinate the merging process.
- **Pseudo-Code**:
  - Initialize `LocalWorkerAdapter`.
  - Initialize `FfmpegStitcher`.
  - Create a dummy `WorkerJob` configuration.
  - Instantiate `JobExecutor` with the job, adapter, and stitcher via `JobExecutionOptions`.
  - Subscribe to `onProgress` to log granular chunk completion events.
  - Call `executor.execute()` and log the final output path.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: While demonstrating local execution, the architecture highlights the pluggable adapter pattern, making it clear how `AwsLambdaAdapter` could be substituted for custom cloud orchestrations.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/infrastructure/examples/job-executor-standalone.ts`.
- **Success Criteria**: The script executes without syntax errors and prints the chunk execution progress and final stitch completion message to the console.
- **Edge Cases**: Ensure the example gracefully catches and logs any execution or merging errors.
- **Integration Verification**: Ensure it correctly imports required classes from `../src/index.js` and runs identically to existing examples.