---
id: PERF-513
slug: enable-site-isolation
status: unclaimed
claimed_by: ""
created: 2024-05-16
completed: ""
result: ""
---

# PERF-513: Enable Site Isolation for Multi-Core Concurrency

## Focus Area
`BrowserPool.ts` (Browser Arguments). We are targeting the thread contention that occurs inside the Chromium renderer process when multiple concurrent worker pages are forced to share a single main thread due to disabled site isolation.

## Background Research
Currently, `BrowserPool.ts` passes `--disable-site-isolation-trials` and disables the `site-per-process` feature. For local compositions loaded via `file://` or the same local HTTP origin, this forces all Playwright pages (workers) into a single Chromium renderer process. Since DOM rendering and `HeadlessExperimental.beginFrame` execution are heavily CPU-bound on the renderer's main thread, grouping all pages into one process eliminates the benefits of our multi-worker architecture (`concurrency > 1`), causing severe thread contention. Re-enabling site isolation will allow Chromium to distribute the rendering workload across multiple processes, better utilizing the multi-core CPU of the microVM.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~16.193s
- **Bottleneck analysis**: Thread contention in Chromium's single renderer process severely limits parallel frame capture throughput.

## Implementation Spec

### Step 1: Remove Site Isolation Disablers
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
1. Remove the `'--disable-site-isolation-trials'` string from the `DEFAULT_BROWSER_ARGS` array.
2. In the `--disable-features=` string within `DEFAULT_BROWSER_ARGS`, remove `IsolateOrigins` and `site-per-process`. The string should change from `'--disable-features=IsolateOrigins,site-per-process,PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion'` to `'--disable-features=PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion'`.
**Why**: By allowing site isolation to function normally, Chromium can spawn a dedicated renderer process for each Playwright page context, dramatically reducing main thread contention and unlocking true parallel DOM capture across CPU cores.
**Risk**: Potential increase in memory usage due to multiple renderer processes overhead.

## Variations
### Variation A: Add `--process-per-tab`
If re-enabling site isolation natively does not split the processes for `file://` URLs, add `--process-per-tab` to `DEFAULT_BROWSER_ARGS` to explicitly force process segregation.

## Canvas Smoke Test
Run a basic canvas render (`mode: 'canvas'`) to ensure the browser argument changes don't crash or prevent Canvas rendering.

## Correctness Check
Verify the rendered output video to ensure the parallel frame captures are still ordered and visually correct.
