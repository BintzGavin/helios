---
id: PERF-196
slug: process-per-tab
status: complete
claimed_by: ""
created: 2024-06-01
completed: ""
result: ""
---
# PERF-196: Process Per Tab Isolation

## Focus Area
Chromium Process Model & Concurrency (in `packages/renderer/src/Renderer.ts`).

## Background Research
Currently, Chromium is launched with `--disable-features=IsolateOrigins,site-per-process`. While disabling Site Isolation was intended to save CPU cycles and memory by reducing the number of total OS processes (PERF-158), it effectively forces multiple rendering workers (Playwright Pages navigating to local \`file://\` URLs) to share the same Chromium renderer process and main thread. In a multi-core CPU microVM with multiple concurrent pages generating `HeadlessExperimental.beginFrame` and `Runtime.evaluate` events, this creates severe lock contention on V8 execution and DOM compositor pipelines. Re-enabling process-per-tab via the `--process-per-tab` Chromium argument (and removing the disable flags) restores process-level parallelism across concurrent worker tabs, allowing multiple cores to be utilized simultaneously for DOM layout, painting, and CDP frame emission.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.2s (with single process sharing)
- **Bottleneck analysis**: Concurrency bottleneck inside the Chromium renderer process when executing `Runtime.evaluate` and `beginFrame` for 4-8 simultaneous worker pages.

## Implementation Spec

### Step 1: Replace Chromium Site Isolation Arguments
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `DEFAULT_BROWSER_ARGS` array, remove `--disable-site-isolation-trials` and `--disable-features=IsolateOrigins,site-per-process`. Add `--process-per-tab` to explicitly instruct Chromium to allocate a new renderer process for each new tab, regardless of origin grouping.
**Why**: Ensures each concurrent worker page has a dedicated Chromium renderer process and main thread, drastically improving multi-core CPU utilization during concurrent DOM capture.
**Risk**: Slightly higher initial memory footprint due to multiple OS processes, but should be well within the VM limits and outweighed by raw processing speed improvements.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode remains functional under multi-process constraints.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to ensure CDP communication remains intact across multiple processes.

## Prior Art
PERF-158 previously disabled site isolation to reduce overhead, but failed to account for multi-page lock contention in a concurrent worker pool architecture.
## Results Summary
- **Best render time**: 33.929s (vs baseline ~34.2s)
- **Improvement**: ~1%
- **Kept experiments**: Process per tab isolation
- **Discarded experiments**: None
