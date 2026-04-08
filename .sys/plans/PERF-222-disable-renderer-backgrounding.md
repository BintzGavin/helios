---
id: PERF-222
slug: disable-renderer-backgrounding
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-222: Disable Renderer Backgrounding

## Focus Area
DOM Rendering Pipeline - Chromium Process Scheduling overhead in `BrowserPool.ts`.

## Background Research
In headless mode, Chromium still applies some background heuristics. Since there is no visible window, the browser may deprioritize the renderer process or throttle background tasks, leading to scheduling micro-stalls. By explicitly passing `--disable-renderer-backgrounding` and `--disable-backgrounding-occluded-windows`, we instruct Chromium to treat the renderer process as always foregrounded and visible. This forces the OS/browser scheduler to keep the renderer threads at maximum priority, preventing arbitrary stalls and improving wall-clock render time in our CPU-bound environment.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.767s
- **Bottleneck analysis**: Micro-stalls from OS and Chromium renderer process background scheduling policies.

## Implementation Spec

### Step 1: Add flags to `DEFAULT_BROWSER_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Add `'--disable-renderer-backgrounding'` and `'--disable-backgrounding-occluded-windows'` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: Disabling background heuristics prevents the Chromium scheduler from throttling or deprioritizing the renderer processes, ensuring maximum CPU utilization for the hot loop.
**Risk**: None in our short-lived microVM environment, as we want to consume all available resources for rendering anyway.

## Correctness Check
Run the DOM render benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to ensure no functionality is broken.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/run-all.ts` to verify the Canvas path is unharmed.

## Prior Art
PERF-221, PERF-219, PERF-218 optimize renderer scheduling and compositing overhead via Chromium flags.
