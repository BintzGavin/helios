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
- [x] Resiliency testing parity between cloud adapters.

### Platform Expansion
*Expand distributed rendering beyond AWS Lambda and Google Cloud Run. All adapters implement the existing `WorkerAdapter` interface (`execute(job: WorkerJob): Promise<WorkerResult>`) in `packages/infrastructure/src/types/adapter.ts`. The `JobExecutor` orchestrator requires zero changes—new adapters are plug-and-play.*

#### Tier 1 — High Impact, Low Friction

- [x] **Cloud execution adapter (Cloudflare Workers).**
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

- [x] **Cloud execution adapter (Fly.io Machines).**
  - Machines API can start/stop VMs on demand—true pay-per-frame. GPU Machines available for WebGL-heavy compositions.
  - **Adapter pattern**: REST API to create Machine → poll for exit → collect output.
  - **Auth**: Bearer token via `FLY_API_TOKEN`.
  - **Constraint**: Machines are full VMs, not functions—adapter must manage VM lifecycle (create, wait, stop).
  - **Dependencies**: None (uses `fetch`).
  - **Files**: `packages/infrastructure/src/adapters/fly-machines-adapter.ts`, test, example, benchmark.

#### Tier 2 — High Impact, Medium Friction

- [x] **Cloud execution adapter (Kubernetes Job API).**
  - Enterprise standard. Any K8s cluster becomes a render farm.
  - **Adapter pattern**: Create K8s Job resource → watch for completion → read logs for output.
  - **Auth**: kubeconfig / in-cluster service account.
  - **Dependencies**: `@kubernetes/client-node`.
  - **Files**: `packages/infrastructure/src/adapters/kubernetes-adapter.ts`, test, example, benchmark.

- [x] **Cloud execution adapter (Docker / Local Swarm).**
  - Distributed rendering across local Docker containers. Perfect for on-prem or CI pipelines.
  - **Adapter pattern**: `docker run` with job spec via env vars or mounted volume (similar to `LocalWorkerAdapter` using `spawn`).
  - **Auth**: Local Docker socket.
  - **Dependencies**: `dockerode` or direct CLI spawn.
  - **Files**: `packages/infrastructure/src/adapters/docker-adapter.ts`, test, example, benchmark.

#### Tier 3 — Future / Track

- [x] Cloud execution adapter (Modal) — Python-native serverless with first-class GPU support.
- [x] Cloud execution adapter (Deno Deploy) — Emerging edge platform with native TS.
- [x] Cloud execution adapter (Vercel Functions) — Huge Next.js ecosystem overlap; 10s timeout is challenging.
- [x] Cloud execution adapter (Hetzner Cloud) — Extremely cost-effective EU compute via API-driven VM provisioning.

#### Cloudflare Sandbox + Workflows (Proven Path)

> **Note**: Cloudflare Workers are too constrained for rendering (no filesystem, no native binaries, 128MB memory). The proven path uses Cloudflare Sandboxes (full Linux containers) orchestrated by Cloudflare Workflows (durable multi-step execution). This architecture has been validated in production via SwirlBot.

- [x] **Cloudflare Sandbox adapter (`cloudflare-sandbox-adapter.ts`).**
  - Full Linux container with Chromium + FFmpeg via `getSandbox()`.
  - Manages container lifecycle: create, execute commands, poll status, cleanup.
  - Must use `keepAlive: true` in getSandbox options (not `setKeepAlive` inside steps).
  - **Footgun**: Container recycling can evict sandboxes mid-render—even at exactly the 6-minute mark.
  - **Dependencies**: Cloudflare Workers SDK.
  - **Files**: `packages/infrastructure/src/adapters/cloudflare-sandbox-adapter.ts`, test, benchmark.

- [x] **R2 artifact storage adapter (`R2StorageAdapter`).**\n\n- [x] **Cloudflare Sandbox Deployment Scaffold (`helios deploy cloudflare-sandbox`).**\n  - Scaffolds a full Cloudflare Workflow and Sandbox deployment.\n  - Validated template includes `keepAlive` and log harvesting.
  - Implements existing `ArtifactStorage` interface for Cloudflare R2.
  - Used for chunk output persistence, log harvesting, and checkpoint/resume.
  - **Dependencies**: S3-compatible SDK or Cloudflare Workers SDK.
  - **Files**: `packages/infrastructure/src/storage/r2-storage.ts`, test, benchmark.

- [x] **Reference Cloudflare Workflow for distributed rendering.**
  - Durable multi-step orchestration: generate ID → provision sandbox → render chunks → poll → stitch → cleanup.
  - Must follow replay determinism: all state-generating logic (IDs, timestamps) inside `step.do()`.
  - Adaptive polling: long initial sleep, shorter polls as completion approaches.
  - Log harvesting to R2 on every poll cycle (assume containers can die at any time).
  - ANSI code handling: Base64-encode or strip logs before returning from steps.
  - **Files**: `examples/distributed-rendering/cloudflare-workflow/`.

- [x] **Cloudflare rendering footguns documentation.**
  - Replay determinism pitfalls and fixes.
  - Container recycling detection via `ps aux` (PID 1 start time) and mitigation via R2 checkpoints.
  - `keepAlive` heartbeat placement (options, not step side-effects).
  - ANSI code handling in Workflow state serialization.
  - Checkpoint/resume pattern for long renders.
  - **Files**: `docs/site/guides/cloudflare-rendering-footguns.md`.


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

- [x] **Documentation**: Add Quickstart guide.
- [x] ⛔ Renderer Verification Blocked: packages/studio dependency mismatch

## Blocked Items
- [x] [v0.46.2] CLI Blocked: Waiting for a new, valid plan in /.sys/plans/

## Blocked Items
- [ ] PLAYER: Waiting for new implementation plans in `/.sys/plans/`.
