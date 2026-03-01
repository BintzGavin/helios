#### 1. Context & Goal
- **Objective**: Implement real-time log streaming for `WorkerAdapter` implementations and orchestrators to enable CLI and interactive interfaces to monitor chunk execution progress.
- **Trigger**: The V2 vision requires robust tooling around distributed rendering, but the current `JobExecutor` architecture strictly buffers outputs. The `packages/cli` command `job run` requires real-time streaming to standard output to maintain a responsive user experience.
- **Impact**: Unblocks the eventual migration of `packages/cli`'s job handling logic to `packages/infrastructure`'s `JobExecutor` by adding the necessary `onStdout` and `onStderr` streaming capabilities natively to the worker abstraction.

#### 2. File Inventory
- **Create**:
  - (None, modifying existing files)
- **Modify**:
  - `packages/infrastructure/src/types/job.ts`: Add `onStdout` and `onStderr` callbacks to the `WorkerJob` interface.
  - `packages/infrastructure/src/orchestrator/job-executor.ts`: Add `onChunkStdout` and `onChunkStderr` callbacks to `JobExecutionOptions` and propagate them down to the adapter execution call.
  - `packages/infrastructure/src/adapters/local-adapter.ts`: Update `LocalWorkerAdapter` to invoke `job.onStdout` and `job.onStderr` when child process data events fire, while continuing to buffer for the final result.
- **Read-Only**:
  - `packages/cli/src/commands/job.ts`: Context on CLI requirements for output.

#### 3. Implementation Spec
- **Architecture**: Extend the `WorkerJob` abstraction to include real-time log event handlers (`onStdout`, `onStderr`). Implement support in the primary local runtime adapter (`LocalWorkerAdapter`) since cloud adapters (Lambda/CloudRun) operate on a request-response model and don't natively stream without websockets or streaming APIs (they will safely ignore or no-op these callbacks). The `JobExecutor` will map global chunk stream events (`onChunkStdout`, `onChunkStderr`) to specific adapter invocations.
- **Pseudo-Code**:
  - `WorkerJob`: Add `onStdout?: (data: string) => void` and `onStderr?: (data: string) => void`
  - `JobExecutionOptions`: Add `onChunkStdout?: (chunkId: number, data: string) => void` and `onChunkStderr?: (chunkId: number, data: string) => void`
  - `JobExecutor`: When calling `this.adapter.execute`, pass `onStdout: (data) => options.onChunkStdout?.(chunk.id, data)` and equivalent for stderr.
  - `LocalWorkerAdapter`: Inside the `child.stdout.on('data')` handler, call `job.onStdout(data.toString())` in addition to appending to the buffered `stdout` string.
- **Public API Changes**:
  - Interface `WorkerJob` gains optional `onStdout` and `onStderr` callback methods.
  - Interface `JobExecutionOptions` gains optional `onChunkStdout` and `onChunkStderr` callback methods.
- **Dependencies**: None.
- **Cloud Considerations**: HTTP-based cloud adapters (AWS Lambda without Response Streaming, Cloud Run standard responses) cannot easily stream output. These adapters will continue to return buffered output at the end of execution. The `onStdout`/`onStderr` capability is strictly an *optional* enhancement for adapters that support it (primarily `LocalWorkerAdapter`), making it safe to introduce without breaking cloud deployments.

#### 4. Test Plan
- **Verification**: Run `npm test` inside `packages/infrastructure`.
- **Success Criteria**:
  - Existing tests for LocalWorkerAdapter and JobExecutor pass.
  - (The actual implementation will include new tests for these callbacks in the respective test files)
- **Edge Cases**: Ensure buffered output in `WorkerResult` remains intact even when callbacks are provided.
- **Integration Verification**: Verify no existing execution logic breaks by running the full test suite.
