---
id: PERF-306
slug: disable-renderer-backgrounding
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-306: Disable Renderer Backgrounding in Multi-Worker Actor Model

## Focus Area
DOM Rendering Pipeline - Chromium Process Scheduling overhead in `BrowserPool.ts`.

## Background Research
In headless mode, Chromium still applies some background heuristics. Since there is no visible window, the browser may deprioritize the renderer process or throttle background tasks, leading to scheduling micro-stalls.

In a previous experiment (PERF-222), explicitly passing `--disable-renderer-backgrounding` and `--disable-backgrounding-occluded-windows` was tested but yielded no improvement. However, that was before the pipeline architecture evolved. Now, the `CaptureLoop.ts` uses a multi-worker actor model with backpressure. The system runs multiple pages concurrently and heavily saturates the OS scheduler. In this new highly concurrent setup, Chromium's backgrounding heuristics might be more aggressive or detrimental to the parallel frame generation loop. Re-testing these flags under the new actor model architecture may yield different results, ensuring maximum CPU utilization across all workers.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.5s
- **Bottleneck analysis**: Micro-stalls from OS and Chromium renderer process background scheduling policies across multiple concurrent workers.

## Implementation Spec

### Step 1: Add flags to `DEFAULT_BROWSER_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Add `'--disable-renderer-backgrounding'` and `'--disable-backgrounding-occluded-windows'` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: Disabling background heuristics prevents the Chromium scheduler from throttling or deprioritizing the renderer processes, ensuring maximum CPU utilization for the hot loop in the new multi-worker architecture.
**Risk**: None in our short-lived microVM environment, as we want to consume all available resources for rendering anyway.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to verify the Canvas path is unharmed.

## Correctness Check
Run the DOM render test `npx tsx tests/verify-dom-strategy-capture.ts` to ensure no functionality is broken.

## Prior Art
PERF-222 tested these flags in an older version of the pipeline. PERF-304 and PERF-305 also modified Chromium flags for scheduling and process management in the new architecture.
