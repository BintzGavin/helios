---
id: PERF-213
slug: single-process
status: complete
claimed_by: ""
created: 2025-05-25
completed: 2026-04-08
result: failed
---
# PERF-213: Disable Chromium Multiprocess Architecture (Single Process)

## Focus Area
Browser Architecture / Process Management

The current `BrowserPool` instantiates headless Chromium using the standard multiprocess architecture. In the strictly CPU-bound, single-VM environment of Jules, Chromium's process isolation, IPC overhead between the browser, utility, and multiple renderer processes is likely a significant source of CPU contention and memory pressure.

In earlier experiments, we learned that the software rasterizer (`--enable-unsafe-swiftshader`) is significantly faster than the CPU fallback when GPU flags are just disabled (PERF-208). We also learned that allocating multiple processes per tab is slightly better than site isolation defaults (PERF-196). However, the underlying constraint remains: we are running many concurrent CPU-heavy rendering jobs (Chromium + FFmpeg) on a limited multi-core CPU. By consolidating Chromium into a single process, we eliminate the IPC overhead of inter-process communication, which can reduce total context switching and micro-stalls on the CPU.

## Background Research
Chromium supports a `--single-process` flag that forces the browser, renderer, GPU (software in our case), and utility threads to run within a single OS process. While this is explicitly unsupported by the Chromium team for production browsing due to security and stability concerns, Helios operates in a trusted execution environment (the renderer is executing local trusted code for the duration of the job).

In standard multi-process mode, `page.screenshot` and CDP commands (`beginFrame`) traverse from Node.js -> Chromium Main Process -> Chromium Renderer Process -> Chromium GPU/Compositor Process -> Chromium Main Process -> Node.js.
In `--single-process` mode, the Chromium internal IPC is replaced with intra-process communication (often direct function calls or shared memory within the same address space). For CPU-bound VMs, this reduction in context switching can improve throughput.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.882s
- **Bottleneck analysis**: CPU contention across multiple OS processes (Node.js + multiple Chromium processes + FFmpeg) during concurrent rendering.

## Implementation Spec

### Step 1: Add `--single-process` argument
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Add `'--single-process'` to the `DEFAULT_BROWSER_ARGS` array. Ensure it is placed before other process-management flags.
**Why**: This forces Chromium to run all of its sub-components (renderer, GPU, utility) inside a single OS process, drastically reducing IPC overhead and context switching in a CPU-bound microVM.
**Risk**: Playwright might fail to launch or connect if it strictly expects multiple processes for certain features, or Chromium might crash if the single-process mode has regressions in the specific version of `chrome-headless-shell` we use.

## Variations
### Variation A: Add `--in-process-gpu`
If `--single-process` alone fails or doesn't improve performance, try adding `'--in-process-gpu'` alongside it or instead of it. This specifically moves the GPU process (which runs the software rasterizer) into the main browser process, eliminating at least one IPC hop.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the canvas rendering pipeline still functions correctly with the single-process flag.

## Correctness Check
Run the main test suite `npx tsx packages/renderer/tests/run-all.ts` to verify that `page.evaluate`, DOM extraction, and screenshots still function correctly when running in a single process.

## Prior Art
- PERF-196 (Process per tab improved performance by reducing contention)
- PERF-211 (Disabling specific features didn't work, but architectural changes have a higher ceiling)
- Chromium documentation on `--single-process` (used in embedded Chromium deployments and specific testing environments).
## Results Summary
- **Best render time**: 0.000s (vs baseline ~33.882s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [single-process]
