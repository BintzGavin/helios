---
id: PERF-526
slug: dedicated-browser-instances
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-526: Dedicated Browser Instances for True Process Isolation

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Browser initialization and worker isolation.

## Background Research
Currently, the `BrowserPool` launches a single Chromium browser process and creates a single `BrowserContext` containing multiple `Page` objects (workers). Because we use `--disable-site-isolation-trials` to save memory and avoid cross-process overhead, Chromium forces all these pages into a single renderer thread.
While `PERF-505` attempted to use dedicated `BrowserContext`s, it still shared the same underlying browser process and hit internal Playwright/Chromium bottlenecks, degrading performance.
To achieve true parallel execution across multiple CPU cores without any Chromium-level thread contention, we must launch entirely independent Browser instances (via multiple `chromium.launch()` calls) for each worker. This guarantees that each worker has its own dedicated Chromium process (main thread, compositor, and V8 isolate), allowing the OS to perfectly parallelize the frame capture loop across available cores. The slight increase in startup time (approx. 200-500ms) will easily be amortized over the duration of the hot loop if frame throughput increases.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.071s
- **Bottleneck analysis**: Thread contention inside the single shared Chromium browser process when multiple workers concurrently request `HeadlessExperimental.beginFrame`, blocking the shared compositor and main threads.

## Implementation Spec

### Step 1: Launch Multiple Browsers
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Instead of storing a single `this.browser` and `sharedContext`, update the initialization logic so that `createPage(index)` calls `chromium.launch(this.getLaunchOptions())`, creates a new context, and returns the dedicated `browser`, `context`, and `page`. Update the `WorkerInfo` interface to include the dedicated `browser` object. Also, define `this.browsers` array replacing `this.browser`.

### Step 2: Update Cleanup Logic
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Update `close()` to iterate over all workers and close their dedicated `context` and `browser` instances (e.g. `await worker.context.close()` and `await worker.browser.close()`) instead of closing a single shared browser context and browser.

**Why**: Completely isolates workers at the OS process level, eliminating any shared resource locks within Chromium or Playwright's connection to a single browser.
**Risk**: Higher peak memory usage (Node.js + N Chromium processes) and slightly longer cold start time. May hit file descriptor or socket limits if concurrency is set extremely high, though our calculated concurrency is modest.

## Variations
- If memory overhead is too high, test reducing concurrency slightly while maintaining dedicated instances.

## Canvas Smoke Test
Run canvas benchmarks to ensure `BrowserPool` correctly provisions instances for both strategies.

## Correctness Check
Run the DOM benchmark and inspect `output.mp4` to verify that all frames were correctly ordered and written without drops.