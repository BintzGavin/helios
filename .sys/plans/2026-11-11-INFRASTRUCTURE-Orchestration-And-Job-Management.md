#### 1. Context & Goal
- **Objective**: Implement Orchestration and job management to support pausing and resuming distributed rendering jobs in `JobManager`.
- **Trigger**: The V2 distributed rendering vision relies on robust orchestration and job management (Priority #5). Large distributed render jobs spanning thousands of chunks require the ability to pause execution (e.g., to free up concurrent resources) and resume from the last completed chunk without restarting the entire job.
- **Impact**: Provides full lifecycle control over `JobSpec` execution, solidifying the `@helios-project/infrastructure` orchestrator as a production-grade tool capable of managing complex cloud rendering workloads.

#### 2. File Inventory
- **Create**:
  - (None)
- **Modify**:
  - `packages/infrastructure/src/orchestrator/job-manager.ts`: Add `pauseJob(id)` and `resumeJob(id, options)` methods.
  - `packages/infrastructure/src/orchestrator/job-executor.ts`: Modify the queue worker to respect pre-completed chunks and support pausing execution via a new `pauseSignal`.
  - `packages/infrastructure/src/types/job-status.ts`: Add `paused` to the `JobState` union type.
- **Read-Only**:
  - `packages/infrastructure/src/types/job-spec.ts`: Reference `JobSpec` and `RenderJobChunk`.

#### 3. Implementation Spec
- **Architecture**: Extend the Orchestration and job management layer to handle stateful interruptions. A job can be paused gracefully. When resumed, `JobManager` will pass the remaining uncompleted chunks to `JobExecutor`.
- **Pseudo-Code**:
  - `types/job-status.ts`:
    - `export type JobState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';`
  - `orchestrator/job-executor.ts`:
    - Update `execute()` to filter out chunks that are already completed (if partial state is provided in `options.completedChunkIds`).
    - The worker loop will check `options.signal?.aborted` for true cancellation, but `JobManager` will handle pausing by aborting the current execution *and* setting state to `paused` instead of `cancelled`.
  - `orchestrator/job-manager.ts`:
    - Add `async pauseJob(id: string): Promise<void>`. This aborts the controller and updates the `JobStatus.state` to `'paused'`.
    - Add `async resumeJob(id: string, options?: JobExecutionOptions): Promise<void>`. This checks if the job is `'paused'`. If so, it reads the logs/completed chunks, extracts `completedChunkIds = job.logs.map(l => l.chunkId)`, and calls `this.runJob()` with an updated internal option to skip those chunks.
- **Public API Changes**:
  - `JobManager` exposes `pauseJob` and `resumeJob`.
  - `JobState` type adds `'paused'`.
- **Dependencies**: Depends on the existing `JobManager` and `JobExecutor` architecture.
- **Cloud Considerations**: Stateless worker execution allows pausing and resuming at the chunk boundary perfectly. Since chunks are independent (stateless rendering), we don't need to save memory states—only the list of successful chunk outputs.

#### 4. Test Plan
- **Verification**: Run `npm test` inside `packages/infrastructure`.
- **Success Criteria**:
  - `JobManager.pauseJob()` successfully stops further chunk execution and sets state to `paused`.
  - `JobManager.resumeJob()` restarts execution *only* for chunks that were not previously completed.
  - Metrics (duration, progress) are preserved across pause/resume cycles.
- **Edge Cases**: Attempting to pause a job that is already completed or cancelled. Attempting to resume a job that is running.
- **Integration Verification**: Verify no existing job cancellation logic is broken.
