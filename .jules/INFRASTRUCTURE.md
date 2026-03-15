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

## [0.24.1] - Governance Tooling Gap
**Learning:** The INFRASTRUCTURE domain cannot manually edit cross-package `package.json` files to resolve dependency mismatches (like CLI needing the latest infrastructure package) because it violates strict domain boundaries. However, `AGENTS.md` explicitly designates "governance tooling" and "release tooling" for internal version propagation as part of the infrastructure domain's responsibility. Without this tooling, agents are blocked by dependency mismatches they are forbidden to fix manually.
**Action:** Plan the implementation of a workspace dependency synchronizer tool within `packages/infrastructure/src/governance/` to automate internal version propagation across the monorepo.

## 0.24.1 - Domain Boundary Enforcement
**Learning:** Planners may generate spec files (e.g. `2026-03-02-INFRASTRUCTURE-Workspace-Dependency-Synchronizer.md`) that attempt to instruct me to implement "governance tooling" or scripts that automatically update `package.json` dependencies across the entire monorepo. Executing these scripts modifies files strictly outside of my `packages/infrastructure/` domain.
**Action:** The instruction to never modify files outside of my domain boundary strictly overrides any explicit plan instructions or justifications about "governance tooling." If a plan requires me to write a script that updates files in other domains (like `packages/cli/`), I must reject the plan, document the blocked state, and immediately stop working.

## 0.26.1 - Real Cloud Storage Adapter
**Learning:** We implemented `ArtifactStorage` and `LocalStorageAdapter` for local simulated distributed rendering, but cloud execution needs real cloud-based storage (like S3) to truly work with the `AwsLambdaAdapter`.
**Action:** Plan an `S3StorageAdapter` to handle real AWS storage for the worker execution.

## 0.28.2 - Documentation Clarity Fallback
**Learning:** The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision (stateless workers, cloud adapters, deterministic seeking, artifact storage, governance tooling are all implemented). According to AGENTS.md, when no feature gaps exist, the agent must focus on allowed fallback actions such as Documentation clarity. Currently, `packages/infrastructure/README.md` lacks documentation for Orchestration, Job Management, Cloud Execution Adapters, and Worker Runtime abstractions.
**Action:** Plan to implement Documentation clarity for the remaining V2 features to ensure the architecture is well understood and maintainable.

## 0.28.3 - Dynamic JobSpec Storage Gap
**Learning:** Remote cloud workers fail to fetch dynamically updated `JobSpec` configurations because `JobManager` does not persist the updated spec (containing the new `assetsUrl`) to a shared `ArtifactStorage` URL before dispatching the execution. While local assets were being uploaded, the actual JSON `JobSpec` instruction file was not, leaving the cloud execution adapter stranded with a stale or unresolvable local path.
**Action:** Plan to add `uploadJobSpec` to `ArtifactStorage` and integrate it into `JobManager.runJob` to ensure stateless workers receive accurate, dynamic job definitions.

## 0.24.0 - Vitest Bench Options Side-Effects
**Learning:** In Vitest benchmarks (`vitest bench`), using `setup` and `teardown` options within the `bench()` configuration executes multiple times in the hot loop. This causes race conditions, missing directories, or disk bloat when setting up heavy file systems or directories.
**Action:** Place heavy setup operations in standard `beforeAll` and `afterAll` hooks outside the benchmark block instead to avoid side-effects and crashes.

## 0.40.23 - WorkerRuntime CloudRun Resiliency
**Learning:** CloudRun server uses `JSON.parse(body)` to process incoming requests. If a request sends invalid JSON, it throws an exception. `WorkerRuntime` exceptions are caught properly if they are in the `try { } catch` block, but the HTTP parsing is outside the runtime.
**Action:** When implementing HTTP servers, ensure `JSON.parse` is wrapped in a try/catch, or that the outer exception handler gracefully returns a 500 error instead of failing internally.

## 0.53.22 - Parameter Formatting for Cloud Adapters
**Learning:** Cloud adapter implementations (e.g., `HetznerCloudAdapter`) might construct shell commands or append properties onto API payloads from optional configuration options. These must be thoroughly tested with unit tests checking the mocked API payload to ensure there are no unhandled execution branches and 100% test coverage is achieved.
**Action:** Include unit tests that supply optional parameters and verify they are correctly propagated to the underlying API invocations.
