# 2026-04-10-INFRASTRUCTURE-Observability-Gap

## 1. Context & Goal
- **Objective**: Implement telemetry capture (durationMs, stdout, stderr) in Orchestration and Job Management to resolve the Observability Gap.
- **Trigger**: The V2 distributed rendering vision lists Orchestration and Job Management as a priority. The `.jules/INFRASTRUCTURE.md` journal identifies an "Observability Gap" where `JobExecutor` discards worker telemetry (`durationMs`) and logs (`stdout`), preventing platforms from calculating billing or showing user logs.
- **Impact**: Enables hosted platforms to calculate billing based on chunk execution duration and allows users to view rendering logs for debugging, satisfying the V2 Monetization Readiness requirement.

## 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/src/orchestrator/job-executor.ts` (Ensure `durationMs`, `stdout`, and `stderr` are emitted via `onChunkComplete`)
  - `packages/infrastructure/src/orchestrator/job-manager.ts` (Ensure `JobManager` properly persists `durationMs` and logs to `JobStatus.metrics` and `JobStatus.logs`)
  - `packages/infrastructure/tests/job-executor.test.ts` (Add tests for telemetry emission)
  - `packages/infrastructure/tests/job-manager.test.ts` (Add tests for telemetry persistence)
- **Read-Only**:
  - `packages/infrastructure/src/types/job-status.ts` (Reference `JobStatus` metrics and logs types)

## 3. Implementation Spec
- **Architecture**:
  - The `JobExecutor` already receives `WorkerResult` (which contains `durationMs`, `stdout`, `stderr`) from the `WorkerAdapter`. It must ensure this entire result is passed to the `onChunkComplete` callback.
  - The `JobManager` handles `onChunkComplete` in `runJob()`. It must accumulate `result.durationMs` into `job.metrics.totalDurationMs` and append `{ chunkId, durationMs, stdout, stderr }` to `job.logs`.
- **Pseudo-Code**:
  - Read `packages/infrastructure/src/orchestrator/job-executor.ts`. Verify if `onChunkComplete` already passes `result`. If not, update it to `await options.onChunkComplete(chunk.id, result)`.
  - Read `packages/infrastructure/src/orchestrator/job-manager.ts`. Locate `onChunkComplete` in `runJob()`.
  - Add logic to initialize `job.metrics.totalDurationMs = 0` and `job.logs = []` if they don't exist.
  - Add logic: `job.metrics.totalDurationMs += result.durationMs;`.
  - Add logic: `job.logs.push({ chunkId, durationMs: result.durationMs, stdout: result.stdout, stderr: result.stderr });`.
  - Ensure these updates are saved to the repository: `await this.repository.save(job);`.
- **Public API Changes**: None to the interfaces, only behavior changes to properly populate existing properties.
- **Dependencies**: None.
- **Cloud Considerations**: Accurate `durationMs` is critical for pay-per-frame cloud execution billing.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/infrastructure -- tests/job-executor.test.ts tests/job-manager.test.ts`
- **Success Criteria**:
  - Tests verify `JobExecutor` emits `WorkerResult` containing `durationMs` and logs.
  - Tests verify `JobManager` correctly accumulates `totalDurationMs` in `job.metrics`.
  - Tests verify `JobManager` correctly appends chunk telemetry to `job.logs`.
- **Edge Cases**:
  - `JobManager` receiving results for a job that was already deleted.
  - Handling missing or malformed `WorkerResult` from adapters.
- **Integration Verification**:
  - The logic will be verified using mocked `WorkerAdapter` and `JobRepository` dependencies in unit tests.
