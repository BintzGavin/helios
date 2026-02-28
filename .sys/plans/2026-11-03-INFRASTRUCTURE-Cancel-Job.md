# INFRASTRUCTURE: Job Cancellation and Listing

#### 1. Context & Goal
- **Objective**: Implement job cancellation via `AbortSignal` in `JobExecutor` and expose `cancelJob` and `listJobs` in `JobManager`.
- **Trigger**: Vision requirement for robust "Orchestration and job management" mentioned in Backlog. Currently, once a job is submitted, it cannot be monitored in aggregate or cancelled, leading to poor resource management and incomplete orchestration APIs.
- **Impact**: Allows users and API consumers to list active jobs and cancel long-running distributed renders, saving cloud resources and preventing zombie executions.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/src/orchestrator/job-executor.ts`
  - `packages/infrastructure/src/orchestrator/job-manager.ts`
  - `packages/infrastructure/tests/job-executor.test.ts`
  - `packages/infrastructure/tests/job-manager.test.ts`
- **Read-Only**:
  - `packages/infrastructure/src/types/job-status.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Expand `JobExecutionOptions` to include `signal?: AbortSignal`.
  - **JobExecutor**: Before processing a chunk from the queue, check if `options.signal?.aborted` is true. If so, set a failure flag and stop processing. Throw an `AbortError`.
  - **JobManager**:
    - Add `listJobs()` returning a promise of job statuses which delegates to `this.repository.list()`.
    - Maintain an internal map of active `AbortController`s (`controllers` map keyed by job ID).
    - In `runJob`, create a new `AbortController`, store it by `jobId`, and pass its signal to `JobExecutor`.
    - Add `cancelJob(id)`. This method retrieves the `AbortController` for the job, calls abort, removes it from the map, and updates the repository status to `cancelled`.
    - Handle the aborted state in `runJob`'s catch block (checking for `AbortError`) to ensure the state is correctly mapped to `cancelled` and not `failed`.

- **Pseudo-Code**:
  - In `JobManager`:
    - Define a map `controllers` to store `AbortController` instances.
    - Implement `listJobs()` to return the list from the repository.
    - Implement `cancelJob(id)`: Look up controller by id, call `abort()`, delete from map. Update job status in repository to `cancelled` if it was pending or running.
    - Inside `runJob()`: create an `AbortController`, store it in `controllers`, and await `executor.execute()` with the signal. In the `catch` block, check if the error is an `AbortError` or the signal is aborted. Clean up the controller in a `finally` block.
  - In `JobExecutor`:
    - Add `signal` option to `JobExecutionOptions`.
    - In the worker loop, check `signal?.aborted` before starting a chunk. Throw an error with name `AbortError` if true.

- **Public API Changes**:
  - `JobExecutionOptions` gets `signal?: AbortSignal`.
  - `JobManager` gets `cancelJob(id: string)` and `listJobs()`.
- **Dependencies**: None.
- **Cloud Considerations**: Halting the loop prevents new chunks from being sent to cloud workers. Already-executing chunks on Lambda/Cloud Run will continue until they naturally finish or timeout.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npx vitest run tests/job-executor.test.ts tests/job-manager.test.ts`
- **Success Criteria**:
  - `listJobs` returns an array of jobs matching the repository.
  - `cancelJob` sets the job state to `cancelled` and stops the `JobExecutor` loop.
  - `JobExecutor` tests verify that an aborted signal prevents pending chunks from executing.
- **Edge Cases**:
  - Calling `cancelJob` on a completed or failed job should be a no-op or handled gracefully.
  - Aborting exactly as the job finishes.
- **Integration Verification**: Ensure existing orchestration workflows remain unaffected if no signal is provided.
