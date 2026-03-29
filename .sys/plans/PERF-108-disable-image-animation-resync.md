---
id: PERF-108
slug: disable-image-animation-resync
status: complete
claimed_by: "executor-session"
created: 2024-05-25
completed: 2024-05-25
result: "discard"
---

# PERF-108: Disable Image Animation Resync in Browser Args

## Focus Area
DOM Rendering Frame Capture Loop - Browser Arguments

## Background Research
In `packages/renderer/src/Renderer.ts`, appending lightweight browser arguments (e.g., `--disable-dev-shm-usage`, `--disable-breakpad`, `--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, `--disable-image-animation-resync`) to `DEFAULT_BROWSER_ARGS` forces a more synchronous main-thread execution model, reduces Chromium IPC overhead, and significantly improves overall DOM rendering performance.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: Standard DOM benchmark
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.4s
- **Bottleneck analysis**: IPC overhead and multithreading overhead in Chromium.

## Implementation Spec

### Step 1: Add `--disable-image-animation-resync` to DEFAULT_BROWSER_ARGS
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Add `--disable-image-animation-resync`, `--disable-checker-imaging`, `--disable-threaded-animation`, `--disable-threaded-scrolling` to the `DEFAULT_BROWSER_ARGS` array.

## Results Summary
- **Best render time**: ~34.901s (vs baseline ~33.4s)
- **Improvement**: -4.5% (Regression)
- **Kept experiments**: none
- **Discarded experiments**: Added `--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, and `--disable-image-animation-resync` to browser arguments. Regressed performance.
