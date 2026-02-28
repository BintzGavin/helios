#### 1. Context & Goal
- **Objective**: Propagate `AbortSignal` from `JobExecutor` to `WorkerAdapter` implementations to enable true graceful cancellation of running chunks.
- **Trigger**: The current "Cancel Job" feature only stops the `JobExecutor` from queuing *new* chunks. Currently executing chunks continue to run because the `WorkerJob` interface and the adapter's `execute` method do not receive or listen to the `options.signal`.
- **Impact**: Prevents orphaned local processes (e.g., `RenderExecutor` child processes) from consuming CPU after a job is cancelled. Also enables aborting active HTTP/RPC requests to cloud workers (AWS Lambda, Cloud Run), saving orchestrator resources and preventing stuck orchestrator processes.

#### 2. File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/infrastructure/src/types/job.ts`
  - `packages/infrastructure/src/orchestrator/job-executor.ts`
  - `packages/infrastructure/src/adapters/local-adapter.ts`
  - `packages/infrastructure/src/adapters/aws-adapter.ts`
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts`
  - `packages/infrastructure/tests/adapters/local-adapter.test.ts` (or equivalent test file if named differently, e.g., `tests/worker-runtime.test.ts`)
  - `packages/infrastructure/tests/job-executor.test.ts`
- **Read-Only**:
  - `packages/infrastructure/src/orchestrator/job-manager.ts`
  - `packages/infrastructure/src/types/adapter.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Add an optional `signal?: AbortSignal` property to the `WorkerJob` interface.
  - Update `JobExecutor.execute()` to map `options.signal` to the `WorkerJob` payload passed to `this.adapter.execute()`.
  - Update `LocalWorkerAdapter`:
    - Listen for the `abort` event on `job.signal`. If aborted, call `child.kill()` and `reject` the promise immediately.
  - Update `AwsLambdaAdapter`:
    - Pass `abortSignal: job.signal` as an option to the `LambdaClient.send()` method to abort the SDK request.
  - Update `CloudRunAdapter`:
    - Pass `signal: job.signal` to the `client.request()` method (which uses Axios/Gaxios under the hood) to abort the pending HTTP request.
- **Pseudo-Code**:
  ```typescript
  // In job.ts
  export interface WorkerJob {
    // ... existing fields
    signal?: AbortSignal;
  }

  // In local-adapter.ts execute()
  if (job.signal) {
    job.signal.addEventListener('abort', () => {
      child.kill();
      reject(new Error('Job was aborted'));
    }, { once: true });
  }

  // In job-executor.ts worker() inside try block
  const result = await this.adapter.execute({
    // ...
    signal: options.signal,
  });
  ```
- **Public API Changes**:
  - `WorkerJob` interface includes an optional `AbortSignal`.
- **Dependencies**: None.
- **Cloud Considerations**:
  - Aborting the SDK/HTTP request for AWS/Cloud Run will free the local orchestration thread, though the actual serverless function may still finish rendering remotely. This is acceptable, as the orchestrator accurately marks the job as cancelled without waiting.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm test`
- **Success Criteria**:
  - Tests pass successfully.
  - A new test in `local-adapter.test.ts` verifies that `child.kill()` is invoked when the `AbortSignal` is triggered.
  - `JobExecutor` tests verify that `options.signal` is correctly passed to the adapter.
- **Edge Cases**:
  - Signal is already aborted before `execute` is called.
  - Signal is aborted just as the process exits naturally.
- **Integration Verification**: Verify that the changes cleanly compile via `npm run lint`.
