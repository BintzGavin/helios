# Scheduler CPU comparison

This runner executes the pinned fframes TextGrid comparison inside the scheduler's existing Cloudflare Sandbox class. The workflow accepts operator requests through Cloudflare's authenticated platform API. Its HTTP handler returns 404, and the temporary deployment disables public and preview URLs.

The renderer inputs are 3334 changing labels, the pinned DM Sans font, 300 frames, 1920×1080 at 30 fps, CRF11, medium and ultrafast presets, matched actual x264 parameters, and equal worker/thread counts. Compilation, dependency installation, quality qualification and artifact transfer are separately timed. Rendering uses fresh processes in alternating engine order. Upstream ultrafast edit-list repair is included in the measured fframes cost and its original artifact is retained.

`build-capsule.py` stages explicitly selected source files outside the repository. Generate the staged package's npm lock with `npm install --package-lock-only --ignore-scripts --workspaces=false`, then archive the staged files and record SHA256. The Rust lock comes from the already prepared pinned CPU comparison crate. `prepare.py` installs public compiler dependencies, compiles the portable package and builds the pinned CPU-only fframes harness outside render timers. It rejects a changed Rust dependency lock.

`worker.mjs` requires the scheduler's installed `@cloudflare/sandbox` 0.7.4 and aliases `scheduler-memory` to the scheduler's `src/tools/memory.ts` during bundling. Its deployment configuration binds `SANDBOX` to class `Sandbox` in script `swirlbot`, `MEMORY` to `swirlbot-memory`, and exports `CpuBenchmarkWorkflow` as workflow `helios-cpu-benchmark`. Account identifiers and task-specific deployment configs stay outside the repository. The Worker contains no credentials, creative authoring or notification path.

Workflow parameters:

```json
{
  "runId": "qualification-01",
  "capsuleSha256": "<64 lowercase hexadecimal characters>",
  "workers": 2,
  "encoderThreads": 1,
  "repeats": 1
}
```

Upload the capsule to `benchmarks/helios-cpu/capsules/<sha256>.tgz` in the existing bucket using Wrangler's remote R2 operation. Trigger the workflow through `wrangler workflows trigger helios-cpu-benchmark <params> --id <runId>` with the isolated configuration. The platform owns authentication; do not retrieve token values or read local environment files.

The first run qualifies four outputs. Subsequent repetitions qualify byte-identical outputs against the same codec oracle; differing outputs receive their own full 300-frame oracle. Every requested video must decode completely. Quality gates are SSIM Y ≥0.995, PSNR Y ≥40 dB and U/V ≥35 dB. A claimed completion without those checks cannot support a speed claim.

Results use `benchmarks/helios-cpu/<runId>/` in R2. `phase.json` identifies the current phase without arbitrary logs. `evidence.tar.gz` contains comparison results, codec-loss statistics, dependency provenance and first-pair videos. `result.json` is published only after the archive upload and sandbox cleanup succeed. Failures leave a phase-only `failure.json`; a failed job may have a partially uploaded archive, but cannot publish a qualified result. The sandbox is destroyed on success and failure.

New requests may opt into `evidenceRetention: "compact"`. The capsule must declare `compactRetention: true`; an unsupported capsule is rejected before compilation. Compact mode performs the same render and quality checks, archives qualification, timings, output hashes, every-frame quality records and dependency/source provenance, and excludes all video copies. The workflow rejects a report that does not attest the requested compact mode. Omitted retention keeps the existing full archive behavior, including first-pair videos. Packing does not modify source evidence or delete existing R2 artifacts. After normal owned-container cleanup, another full decode of compact evidence requires rerendering. This mode requires a newly staged capsule and updated benchmark controller; it does not change already deployed jobs.

No background wakeup is assumed. If the local runtime has no supported completion-message primitive, report the specific running workflow and inspect its terminal result when returning to the thread; do not use a polling loop or claim an automatic wakeup.

Given the deployed scheduler image may omit Python, when a fixed benchmark starts, staging installs Python before extracting the source capsule. Commands use an explicit, non-secret Linux executable search path. Failed bootstrap commands must withhold benchmark results and clean up the sandbox.

Given the comparison manifest, qualification rejects missing or duplicate engine/preset/round combinations, altered CPU budgets or workload, unequal x264 versions or parameters, incomplete cadence, failed processes, and non-finite timings. A `passed` oracle flag alone is insufficient: all 300 SSIM and PSNR records and the numerical per-channel thresholds are required.

Given a live or retained benchmark instance, an operator-only observer workflow subscribes to its terminal lifecycle events through `WorkflowInstance.subscribe()`. It blocks on the actual subscription, saves only validated instance/type/event/timestamp metadata, disposes the RPC subscription on every exit, and emits a controlled terminal marker. It never retains event outputs or error messages. The observer cannot create render jobs. A sanitized Wrangler tail can wait for that marker; this is a completion stream, not status polling or a promised thread wakeup.

Given qualified render metadata, persist a candidate report with `status: artifacts-pending` before uploading large output evidence. Final qualification still requires complete artifact publication and cleanup. Given a large archive, serve only benchmark files on a private container port and stream the HTTP body with its validated Content-Length to R2; avoid base64 SSE conversion and whole-file buffering. Always stop the temporary file server. Persist controlled phase/operation records before actions so workflow replay cannot replace artifact-transfer failures with input-validation. Validate the real binary path with a bounded synthetic artifact before another expensive compiler run.

Given publication failed after rendering and quality qualification, recovery first checks the original benchmark container's current state. It must not start a stopped container or rerender the scene. If existing qualified files remain in a healthy container, validate their manifest and hashes, persist a candidate, repack only selected evidence without arbitrary logs, stream the archive through the qualified binary path, clean up, then publish the recovered report. The original render timers remain authoritative; recovery costs are separate.

Given a newly owned sandbox, disable indefinite keepalive and set a finite idle interval before running commands: 90 minutes for the comparison, 15 minutes for a transfer probe. Initialization failure destroys the sandbox. Explicit cleanup remains required; idle expiry only bounds an orphan after an external runtime failure. Recovery does not start or reinitialize the original container.

The optional workflow bindings are `CPU_OBSERVER`/`CpuBenchmarkObserver`, `CPU_TRANSFER_PROBE`/`CpuBenchmarkTransferProbe`, and `CPU_RECOVERY`/`CpuBenchmarkRecovery`. Bundling must load the recovery Python sources as text (`--loader:.py=text`). These operator workflows preserve the default HTTP rejection behavior and require no public routes.

`CPU_READINESS_PROBE`/`CpuReadinessProbe` separately measures the scheduler's fixed five-second Vite delay against bounded composition readiness on its frozen 10-second 720p/24-fps scene. Bind `scheduler-readiness` to the scheduler's `src/tools/render-readiness.ts` and load the container script with `--loader:.txt=text`. Submit only after other timed container benchmarks finish. Both interleaved pairs must decode all 240 frames, match the expected moving-square positions, and have identical decoded pixels in every frame. The creative Worker remains unchanged. This scene's video evidence is capped at 32 MiB total; no large TextGrid archive is necessary for the readiness check.

Given a fresh checkpoint-capable capsule, when three rounds execute separately, each command renders one original round using `--round-start`, preserving alternating engine order. The merged report retains twelve distinct engine/preset/round results and unchanged render timers. Missing or duplicate pairs, incorrect round numbers, changed hardware/settings, and missing provenance must fail before accepting the next round. The aggregate execution receipt sums successful round durations. `protocol-version.json` must declare `checkpointedRounds: true`; legacy capsules are rejected before compilation by the checkpointed runner.

The fresh runner uses separate persisted steps for staging, preparation, each paired round, quality, publication and cleanup. Each command step has a 29-minute bound. Replay skips completed commands and never starts a stopped prepared container. The existing observer's single subscription step remains unsuitable for jobs longer than Cloudflare's 30-minute step limit; use a bounded completion stream and confirm native terminal status separately until that observer is revised. No long-job observation guarantee is inferred from the short retained-event integration probe.

`CPU_RESUME`/`CpuBenchmarkResume` can qualify already completed paired outputs after an outer workflow timeout. It waits on the actual existing process when needed, validates all requested outputs, and separates qualification and publication into bounded steps. It must never rerender or compile the comparison, and its report preserves original render timers while reporting continuation cost separately.

Full videos and archives are temporary verification material. After complete decoding, every-frame quality checks and archive integrity pass, retain a remotely round-trip-verified compact bundle and cleanup manifest, then remove the large artifacts. Reproducing a full decode after cleanup requires rerendering the pinned workload.

Given qualified evidence has been published and the owned container destroyed, emit one bounded completion marker through a persisted terminal step. Replay must not emit another marker or repeat rendering. A failed render or publication cannot emit qualified completion. This direct completion path does not depend on the observer's long subscription step.

Given Workflow replay resets closure state, persisted active phase and operation records take precedence over input-validation defaults. Persist numeric command failure evidence immediately, preserve it during abort handling, and journal cleanup separately from the failed operation. Given separate durable steps, reacquire opaque Sandbox clients inside each executing step; do not carry request-bound clients across steps or start a stopped prepared container. Failed preparation must retain bounded stage exit records before cleanup so another run does not require guessing its cause.
