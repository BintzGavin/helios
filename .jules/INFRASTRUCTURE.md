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
