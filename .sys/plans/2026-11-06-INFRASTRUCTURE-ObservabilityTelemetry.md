#### 1. Context & Goal
- **Objective**: Implement job execution observability by tracking telemetry and log data from individual render chunks.
- **Trigger**: V2 AGENTS.md requires "Monetization Readiness" and notes "Architecture must not preclude paid registries, hosted rendering, or platform services." Currently, `WorkerResult` data (durationMs, stdout, stderr) is discarded by `JobExecutor`, precluding billing based on compute time and exposing logs to platform users.
- **Impact**: Enables future hosted rendering platform services to calculate compute costs, provide debugging logs to users, and monitor overall job health.

#### 2. File Inventory
- **Create**:
  - (No new files)
- **Modify**:
  - `packages/infrastructure/src/types/job-status.ts`: Extend `JobStatus` to include a new `metrics` object and `logs` array.
  - `packages/infrastructure/src/orchestrator/job-executor.ts`: Update `JobExecutionOptions` with an `onChunkComplete` callback and invoke it with the `WorkerResult`.
  - `packages/infrastructure/src/orchestrator/job-manager.ts`: Implement `onChunkComplete` in `runJob` to persist telemetry to `JobStatus` via the `JobRepository`.
  - `packages/infrastructure/tests/job-executor.test.ts`: Add test verifying `onChunkComplete` is called with correct telemetry.
  - `packages/infrastructure/tests/orchestrator/job-manager.test.ts`: Add test verifying telemetry is aggregated correctly.
- **Read-Only**:
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/orchestrator/file-job-repository.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the Observer pattern in `JobExecutor` to emit detailed worker results upon chunk completion, which `JobManager` aggregates into persistent job state.
- **Pseudo-Code**:
  - Add `totalDurationMs`, `logs` array to `JobStatus`.
  - In `JobExecutor`: `const result = await this.adapter.execute(...); if (options.onChunkComplete) options.onChunkComplete(chunk.id, result);`
  - In `JobManager`: `onChunkComplete: async (chunkId, result) => { job.totalDurationMs += result.durationMs; job.logs.push({ chunkId, ... }); await repo.save(job); }`
- **Public API Changes**:
  - `JobStatus` interface expanded.
  - `JobExecutionOptions` interface gains `onChunkComplete?: (chunkId: number, result: WorkerResult) => void | Promise<void>`.
- **Dependencies**: None.
- **Cloud Considerations**: Ensures serverless execution duration (Lambda/CloudRun) is tracked at the orchestrator level for billing/monitoring.

#### 4. Test Plan
- **Verification**: Run `npm run test --prefix packages/infrastructure`
- **Success Criteria**:
  - Tests pass successfully.
  - `JobManager` test proves that after a multi-chunk job, `JobStatus.metrics.totalDurationMs` is the sum of chunk durations and stdout/stderr are preserved in `JobStatus`.
- **Edge Cases**: Verify behavior when chunks fail (capture stderr before aborting).
- **Integration Verification**: Verify local end-to-end execution maintains correct telemetry aggregation.
