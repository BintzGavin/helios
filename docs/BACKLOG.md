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
- [x] **CLI**: Implement regression tests for remaining commands.
- [x] **Examples**: Create examples demonstrating distributed rendering workflows.
- [x] **Examples**: Create examples demonstrating component usage.

## Maintenance & Stability
*Core and renderer stability are prerequisites.*

- [x] **Fix GSAP Timeline Synchronization in SeekTimeDriver**
  - **Problem**: Promo video (`examples/promo-video/composition.html`) renders a black video with only the background visible. GSAP timeline animations aren't being seeked during rendering.
  - **Root Cause**: `window.__helios_gsap_timeline__` is not available when `setTime()` first runs, and subscription timing may be off.
  - **Goal**: Ensure GSAP timelines are correctly synchronized during frame capture.
  - **Verification**: `examples/promo-video` must render correctly with all scenes visible.
  - **Note (2026-07-31)**: `examples/promo-video` was archived out of the repo; this
    verification path no longer exists. See the same failure mode for motion.dev in
    "Third-party animation libraries are invisible to the first seek" below.

- [x] **Third-party animation libraries are invisible to the first seek** *(fixed 2026-07-31)*
  - **Fix**: `SeekTimeDriver` now reads `document.getAnimations().length` on every seek
    and rebuilds the scoped animation list whenever that count moves, instead of caching
    it permanently on the first seek. Sets `window.__HELIOS_LATE_ANIMATIONS__` when it
    sees the count grow, so late instantiation is detectable.
  - **Rejected first attempt**: "re-scan until the count is stable for N seeks" is NOT
    sufficient — the count sits at its wrong initial value long enough to satisfy the
    stability test, and the cache then locks in that wrong value. A render with that
    version still produced blank scenes at 3s, 11s and 13s.
  - **Regression test**: `late-anim-test/` renders a declarative CSS animation alongside
    one created inside a `requestAnimationFrame` callback (i.e. after `window.helios` is
    set, which is how motion.dev and GSAP behave under virtualized time). Both must track
    identically. Measured: x=140/140 at 0.1s, 640/640 at 2.0s, 1036/1036 at 3.5s.
    Worth porting into `packages/renderer/tests/` in the harness' own format.
  - **Problem**: `SeekTimeDriver` caches the animation list on its first seek and only
    clears it via `window.__helios_invalidate_cache()`. Libraries that defer creating
    their WAAPI animations to their own frame loop have created *nothing* by then,
    because the renderer runs the page under virtualized time and that loop never ticks.
    Measured in a DOM render: `document.getAnimations()` returned **3** (the declarative
    CSS animations) instead of **72**. The other 69 were never seeked for the entire
    render — every scene before the point where they happened to materialize came out
    blank, and the cutover time moved between runs with machine load.
  - **Why it matters**: this is the same root cause as the GSAP item above, and it fails
    **silently** — the CLI prints `Render complete!` and the MP4 probes as a perfectly
    valid 1920x1080/30fps file. Only frame sampling catches it. `guided/promo-video` in
    `helios-skills` instructs agents to animate with motion.dev, so this is on the
    default authoring path.
  - **Workaround (composition side)**: retain every handle `animate()` returns and call
    `.pause()` on each before setting `window.helios`, which forces instantiation.
  - **Goal**: fix it engine-side — invalidate the cache after the first seek (once the
    frame loop has ticked), or warn when the animation count changes after caching.
  - **Verification**: a DOM composition animated with motion.dev renders all scenes,
    verified by sampling frames from the encoded file rather than by exit code.

- [ ] **Renderer should warn when `window.helios` is absent**
  - **Problem**: a composition whose module fails to load (e.g. served over `file://`,
    where an ES module import is CORS-blocked) renders with `window.helios` undefined.
    For a pure-CSS composition the output can look correct, because `SeekTimeDriver`
    drives WAAPI directly — so the engine appears to work while it is not wired up.
    The README's headline command, `npx helios render ./composition.html`, is a
    `file://` invocation and hits exactly this.
  - **Goal**: warn loudly when `window.helios` is missing after the readiness wait —
    `SeekTimeDriver` already warns when `isVirtualTimeBound` is false. Document that
    compositions must be served over HTTP.

- [x] **Documentation**: Add Quickstart guide.
- [x] ⛔ Renderer Verification Blocked: packages/studio dependency mismatch

## Blocked Items
- [x] [v0.46.2] CLI Blocked: Waiting for a new, valid plan in /.sys/plans/

## Blocked Items
- [x] [v0.46.14] CLI Blocked: Waiting for a new, valid plan in /.sys/plans/
- [x] STUDIO: 2026-11-14-STUDIO-Update-Keyboard-Shortcuts-Documentation is structurally obsolete.
- [x] [v0.46.20] CLI Blocked: Waiting for a new, valid plan in /.sys/plans/
- [x] [v0.46.21] CLI Unblocked: Generated plan /.sys/plans/2027-06-05-CLI-Registry-Manifest-Regression-Tests.md
- [x] [v0.46.22] CLI Unblocked: Generated plan /.sys/plans/2027-06-05-CLI-Templates-Regression-Tests.md
- [x] [v0.46.29] CLI Unblocked: Generated strictly new plan /.sys/plans/2027-06-05-CLI-Cloud-Templates-Regression-Tests-V2.md
- [x] [v0.46.36] CLI Unblocked: Generated strictly new plan /.sys/plans/2027-06-05-CLI-Job-Render-Merge-Regression-Tests-Missing-Mock.md
- [x] [v0.121.16] STUDIO Blocked: Waiting for a new, valid plan in /.sys/plans/
- [x] [v0.46.40] CLI Unblocked: Generated strictly new plan /.sys/plans/2027-06-05-CLI-Command-Coverage-Tests-V3.md
- [x] [v0.46.39] CLI Unblocked: Generated strictly new plan /.sys/plans/2027-06-05-CLI-Command-Coverage-Tests-V3.md

- [x] [v0.46.40] CLI Unblocked: Generated plan /.sys/plans/2027-06-05-CLI-Command-Coverage-Tests-V4.md
- [x] [v0.46.43] CLI Unblocked: Generated plan /.sys/plans/2027-06-05-CLI-Command-Coverage-Tests-V6.md
- [x] [v0.46.57] CLI Blocked: Waiting for a new, valid plan in /.sys/plans/
- [x] [v0.79.4] PLAYER Blocked: Waiting for a new, valid plan in /.sys/plans/

- [x] Execute plan `.sys/plans/2026-06-25-STUDIO-Improve-AudioMixerPanel-Coverage-V3.md` to resolve act warnings in tests.
- [ ] [v0.79.14] PLAYER Blocked: Waiting for a new, valid plan in /.sys/plans/

- [ ] [v0.79.15] PLAYER Blocked: Waiting for a new, valid plan in /.sys/plans/
- [x] [v0.46.65] CLI Blocked: Waiting for a new, valid plan in /.sys/plans/

- [ ] [v0.79.16] PLAYER Blocked: Waiting for a new, valid plan in /.sys/plans/