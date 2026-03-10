# Helios Backlog

This backlog tracks concrete deliverables derived from [`AGENTS.md`](../AGENTS.md).

## Distributed Rendering
*Helios must support distributed rendering suitable for cloud execution.*

- [x] Implement stateless worker architecture.
- [x] Implement CLI job generation (`--emit-job`).
- [x] Ensure deterministic frame seeking across all drivers.
- [x] Support frame range rendering in CLI.
- [x] Implement output stitching without re-encoding (verify `concat` demuxer workflow).
- [x] Implement RenderExecutor abstraction for pluggable execution.
- [x] Cloud execution adapter (Google Cloud Run).
- [x] Cloud execution adapter (AWS Lambda).

### Platform Expansion
*Expand distributed rendering beyond AWS Lambda and Google Cloud Run. All adapters implement the existing `WorkerAdapter` interface (`execute(job: WorkerJob): Promise<WorkerResult>`) in `packages/infrastructure/src/types/adapter.ts`. The `JobExecutor` orchestrator requires zero changes—new adapters are plug-and-play.*

#### Tier 1 — High Impact, Low Friction

- [ ] **Cloud execution adapter (Cloudflare Workers).**
  - Already the platform SwirlBot runs on. Sub-50ms cold starts.
  - **Adapter pattern**: HTTP POST to Worker route with `{ jobPath, chunkIndex }` payload.
  - **Auth**: Cloudflare service token header or mTLS.
  - **Constraint**: 128MB memory limit (sufficient for frame capture); CPU time limits require careful chunk sizing.
  - **Dependencies**: None (uses `fetch`).
  - **Files**: `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts`, test, example, benchmark.

- [x] **Cloud execution adapter (Azure Functions).**
  - Second-largest serverless market. Consumption plan pricing is competitive with Lambda.
  - **Adapter pattern**: HTTP trigger with JSON payload, nearly identical to Lambda invocation model.
  - **Auth**: Function key in query param or `x-functions-key` header.
  - **Dependencies**: None (uses `fetch`).
  - **Files**: `packages/infrastructure/src/adapters/azure-functions-adapter.ts`, test, example, benchmark.

- [ ] **Cloud execution adapter (Fly.io Machines).**
  - Machines API can start/stop VMs on demand—true pay-per-frame. GPU Machines available for WebGL-heavy compositions.
  - **Adapter pattern**: REST API to create Machine → poll for exit → collect output.
  - **Auth**: Bearer token via `FLY_API_TOKEN`.
  - **Constraint**: Machines are full VMs, not functions—adapter must manage VM lifecycle (create, wait, stop).
  - **Dependencies**: None (uses `fetch`).
  - **Files**: `packages/infrastructure/src/adapters/fly-machines-adapter.ts`, test, example, benchmark.

#### Tier 2 — High Impact, Medium Friction

- [ ] **Cloud execution adapter (Kubernetes Job API).**
  - Enterprise standard. Any K8s cluster becomes a render farm.
  - **Adapter pattern**: Create K8s Job resource → watch for completion → read logs for output.
  - **Auth**: kubeconfig / in-cluster service account.
  - **Dependencies**: `@kubernetes/client-node`.
  - **Files**: `packages/infrastructure/src/adapters/kubernetes-adapter.ts`, test, example, benchmark.

- [ ] **Cloud execution adapter (Docker / Local Swarm).**
  - Distributed rendering across local Docker containers. Perfect for on-prem or CI pipelines.
  - **Adapter pattern**: `docker run` with job spec via env vars or mounted volume (similar to `LocalWorkerAdapter` using `spawn`).
  - **Auth**: Local Docker socket.
  - **Dependencies**: `dockerode` or direct CLI spawn.
  - **Files**: `packages/infrastructure/src/adapters/docker-adapter.ts`, test, example, benchmark.

#### Tier 3 — Future / Track

- [ ] Cloud execution adapter (Modal) — Python-native serverless with first-class GPU support.
- [ ] Cloud execution adapter (Deno Deploy) — Emerging edge platform with native TS.
- [ ] Cloud execution adapter (Vercel Functions) — Huge Next.js ecosystem overlap; 10s timeout is challenging.
- [ ] Cloud execution adapter (Hetzner Cloud) — Extremely cost-effective EU compute via API-driven VM provisioning.


## Component Registry
*Helios will support a Shadcn-style component registry.*

- [x] Design registry manifest format.
- [x] Implement CLI command to fetch and copy components.
- [x] Implement component tracking in `helios.config.json`.
- [x] Create initial set of core components.

## Product Surface (Studio, CLI, Examples)
*Studio, CLI, and examples are first class product surfaces in V2.*

- [x] **Studio**: Expand features to support distributed rendering configuration.
- [x] **CLI**: Implement init command.
- [x] **CLI**: Implement registry commands.
- [x] **CLI**: Implement diff command.
- [x] **CLI**: Implement render command.
- [x] **CLI**: Implement example init (`helios init --example`).
- [x] **CLI**: Make example registry configurable (remove hardcoded URL).
- [x] **Examples**: Create examples demonstrating distributed rendering workflows.
- [x] **Examples**: Create examples demonstrating component usage.

## Maintenance & Stability
*Core and renderer stability are prerequisites.*

- [x] **Fix GSAP Timeline Synchronization in SeekTimeDriver**
  - **Problem**: Promo video (`examples/promo-video/composition.html`) renders a black video with only the background visible. GSAP timeline animations aren't being seeked during rendering.
  - **Root Cause**: `window.__helios_gsap_timeline__` is not available when `setTime()` first runs, and subscription timing may be off.
  - **Goal**: Ensure GSAP timelines are correctly synchronized during frame capture.
  - **Verification**: `examples/promo-video` must render correctly with all scenes visible.

- [ ] **Documentation**: Add Quickstart guide.
- [x] ⛔ Renderer Verification Blocked: packages/studio dependency mismatch

## PLAYER Agent Status
- [ ] 🚫 Blocked: No new plan found in `/.sys/plans/` for `PLAYER`. Waiting for Planner to create the next implementation spec.

## INFRASTRUCTURE Agent Status
- [ ] 🚫 Blocked: No uncompleted implementation plans found for my domain in `/.sys/plans/`. I must stop working.
- [ ] 🚫 Blocked: No uncompleted implementation plans found for my domain in `/.sys/plans/`. I must stop working.
- [ ] 🚫 Blocked: No uncompleted implementation plans found for my domain in `/.sys/plans/`. I must stop working.
- [ ] 🚫 Blocked: No new plan found in `/.sys/plans/` for `INFRASTRUCTURE`. Waiting for Planner to create the next implementation spec.
- [ ] 🚫 Blocked: No uncompleted implementation plans found for my domain in `/.sys/plans/`. I must stop working.
- [ ] 🚫 Blocked: The only available plans (`2026-03-02-INFRASTRUCTURE-SyncDependency.md` and `2026-03-02-INFRASTRUCTURE-Workspace-Dependency-Synchronizer.md`) require modifying files outside of my domain (`packages/cli/package.json` and the root workspace package definitions), which strictly violates my boundaries. I must stop working.
- [ ] 🚫 Blocked: The available plan (`2026-11-13-CLI-Cloud-Worker-Execution.md`) asks me to modify files outside of my domain (`packages/cli/src/commands/job.ts`), which strictly violates my boundaries. I cannot implement CLI execution commands.
- [ ] 🚫 Blocked: No uncompleted implementation plans found for my domain in `/.sys/plans/`. I must stop working.
