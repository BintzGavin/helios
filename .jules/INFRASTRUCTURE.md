# Infrastructure Agent Journal

Critical learnings only. This is not a log—only add entries for insights that will help avoid mistakes or make better decisions.

## [0.0.0] - Initial State
**Learning:** The Infrastructure package does not yet exist. First task should scaffold `packages/infrastructure/` with proper package.json, tsconfig.json, and directory structure before implementing features.
**Action:** Ensure package scaffolding is the first plan before any feature work.

## [0.5.1] - Granular Progress Tracking Gap
**Learning:** The `JobExecutor` lacks granular progress reporting (it doesn't emit events when chunks complete). This prevents `JobManager` from updating the `JobStatus.progress` and `JobStatus.completedChunks` correctly during execution.
**Action:** Plan to add an `onProgress` callback to `JobExecutionOptions` and integrate it with `JobManager`.

## [0.9.1] - Cloud Deployment Tooling Gap
**Learning:** The `packages/infrastructure` implements cloud adapters (`AwsLambdaAdapter`, `CloudRunAdapter`) to invoke jobs, and a `WorkerRuntime` to execute them, but lacks the actual server/handler templates that run inside AWS Lambda or Cloud Run to bridge these two components. This forces users to write boilerplate to connect the adapter payload to `WorkerRuntime`.
**Action:** Plan to add `createAwsHandler` and `createCloudRunServer` entrypoint generators to satisfy the V2 requirement for "deployment tooling".

## [0.10.0] - Observability Gap
**Learning:** V2 Monetization Readiness for hosted rendering requires Job observability. Currently, `JobExecutor` discards worker telemetry (`durationMs`) and logs (`stdout`), which prevents platforms from calculating billing or showing user logs.
**Action:** Plan to implement telemetry capture via `onChunkComplete` and persist it in `JobStatus` to enable hosted platforms.

## [0.11.0] - Robust Command Parsing & Housekeeping Gap
**Learning:** The `parseCommand` utility in `packages/infrastructure/src/utils/command.ts` currently splits strings purely by whitespace. This will break when `JobSpec` commands contain quoted arguments with spaces (e.g., `-metadata title="My Render"` or paths with spaces). Additionally, `package.json` is missing a `lint` script, which breaks CI/CD consistency, and its version (`0.1.0`) is out of sync with actual release status.
**Action:** Plan to implement a robust command parser (handling quotes) and perform package housekeeping (sync version, add lint script) to ensure distributed render commands execute correctly on workers.

## [0.14.0] - CLI Adoption Blocker for JobExecutor
**Learning:** The `packages/cli` is blocked from adopting the infrastructure `JobExecutor` because `WorkerAdapter` implementations (like `LocalWorkerAdapter`) currently buffer output and return it only upon completion. The CLI requires real-time streaming of `stdout` and `stderr` to display progress during local chunk rendering.
**Action:** Plan to implement real-time log streaming via `onStdout` and `onStderr` callbacks in the `WorkerJob` interface, and propagate them via `JobExecutionOptions` to unblock CLI adoption.

## [0.18.0] - Dynamic Cloud Executions
**Learning:** `AwsLambdaAdapter` statically requires `jobDefUrl` at initialization, whereas `CloudRunAdapter` correctly supports reading it from `job.meta.jobDefUrl`. This discrepancy prevents `AwsLambdaAdapter` from being used generically in multi-tenant environments where the job definition URL changes per execution. Also, `JobManager` lacks a deletion mechanism, causing job artifacts to accumulate.
**Action:** Plan to refactor `AwsLambdaAdapter` for dynamic `jobDefUrl` support and add `deleteJob` to orchestration components to maintain a clean environment.

## [0.20.0] - Artifact Storage Gap for Distributed Executions
**Learning:** V2 Infrastructure requires distributed rendering for cloud execution. The current cloud adapters (`AwsLambdaAdapter` and `CloudRunAdapter`) pass job payloads, but lack a mechanism to securely upload local rendering assets to a shared location before the job begins, and subsequently allow workers to securely fetch those assets prior to rendering chunks. This forces local and remote environments to be tightly coupled.
**Action:** Plan to implement an `ArtifactStorage` interface and concrete implementations (like `LocalStorageAdapter`) to cleanly handle asset uploading/downloading to decouple local jobs from remote worker execution.

## [0.22.0] - Remote Job Assets Fetching Gap
**Learning:** We implemented `ArtifactStorage` and `LocalStorageAdapter` in v0.21.0 to support uploading assets. However, the `WorkerRuntime` and cloud entrypoints (`aws-handler.ts`, `cloudrun-server.ts`) still lack the mechanism to use `ArtifactStorage` to fetch those assets. `JobSpec` also needs fields to carry the `assetsUrl` and job `id` so the worker knows where to download them from before executing rendering chunks.
**Action:** Plan to integrate `ArtifactStorage` into `WorkerRuntime` and update `JobSpec` to support remote asset fetching to close the distributed rendering vision gap.

## [0.23.0] - Orchestrator Asset Upload Integration
**Learning:** While `ArtifactStorage` was integrated into `WorkerRuntime` to download remote assets, we missed the orchestrator side of the equation. Neither `JobManager` nor `JobExecutor` currently use `ArtifactStorage` to upload the local project assets before remote cloud execution begins. Furthermore, if this upload modifies `JobSpec.assetsUrl`, it must be done in `JobManager` before `JobExecutor` runs to ensure the updated spec is saved to `JobRepository`.
**Action:** Plan to integrate `ArtifactStorage` upload into `JobManager.runJob` to ensure remote workers have assets available, closing the loop on distributed cloud rendering.

## [0.24.0] - Artifact Storage Cleanup Gap
**Learning:** While `ArtifactStorage` supports uploading and downloading job assets, it lacks a mechanism to delete them. Consequently, when `JobManager.deleteJob` is called to clean up job state, the remote job assets are leaked in storage, which violates the architectural goal of maintaining a clean distributed execution environment.
**Action:** Plan to add `deleteAssetBundle` to the `ArtifactStorage` interface and integrate it into `JobManager.deleteJob` to ensure proper resource cleanup.
