#### 1. Context & Goal
- **Objective**: Enhance the `JobExecutor` to report real-time chunk completion progress so that orchestrators like `JobManager` can track execution state granularly.
- **Trigger**: There is a documented vision gap and a `TODO` in `packages/infrastructure/src/orchestrator/job-manager.ts` (`// TODO: Enhance JobExecutor to report progress.`). Tracking granular progress is a key feature of robust orchestration systems that support cloud execution and user feedback.
- **Impact**: Unlocks the ability for `JobManager` to update its repository with progress (0-100%) during a job run instead of jumping straight from 'running' to 'completed'. This is essential for exposing progress indicators on the product surfaces (e.g., CLI `job` command).

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/src/orchestrator/job-executor.ts` (Add progress callback option and trigger it on chunk completion)
  - `packages/infrastructure/src/orchestrator/job-manager.ts` (Hook into the new callback to update repository state)
- **Read-Only**:
  - `packages/infrastructure/src/types/job-status.ts`
  - `packages/infrastructure/src/types/job-spec.ts`

#### 3. Implementation Spec
- **Architecture**: The `JobExecutionOptions` interface will be extended to include an optional `onProgress` callback. The `JobExecutor` will invoke this callback whenever a chunk completes successfully, passing the current number of completed chunks and the total number of chunks. `JobManager` will provide this callback when calling `this.executor.execute` and update its internal `JobStatus` state via the `JobRepository`.
- **Pseudo-Code**:
  - In `JobExecutionOptions` (`job-executor.ts`), add `onProgress?: (completedChunks: number, totalChunks: number) => void;`.
  - In `JobExecutor.execute` loop, after a chunk successfully finishes and `completedChunks++` is incremented, check if `options.onProgress` exists and call it: `options.onProgress(completedChunks, totalChunks);`.
  - In `JobManager.runJob` (`job-manager.ts`), update the call to `this.executor.execute(jobSpec, options)` to merge the `onProgress` callback into the options.
  - The `onProgress` callback should calculate progress percentage: `const progress = Math.round((completedChunks / totalChunks) * 100);`.
  - It should update the job instance and call `await this.repository.save(job)`.
- **Public API Changes**:
  - `JobExecutionOptions` now accepts `onProgress`.
- **Dependencies**: None.
- **Cloud Considerations**: Progress reporting is cloud-agnostic; it simply relies on the worker adapter successfully resolving a chunk.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/infrastructure`. Create specific tests in `tests/job-executor.test.ts` to verify the `onProgress` callback is called the expected number of times with correct values. Create tests in `tests/orchestrator/job-manager.test.ts` to ensure `runJob` correctly updates the `progress` field in the repository mid-run.
- **Success Criteria**: Tests pass. `JobManager` unit tests show the job repository being updated with `completedChunks` and `progress` fields incrementing as chunks resolve.
- **Edge Cases**: Ensure the progress callback is not invoked if a chunk fails and is being retried until it eventually succeeds. Ensure progress is not sent after a fatal job failure. Ensure `JobManager` uses a safe async/await pattern or promise handling for the repository save in the callback.
- **Integration Verification**: Verify that the job finishes correctly and still transitions to `'completed'` or `'failed'` accurately.
