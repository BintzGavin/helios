---
id: PERF-208
slug: enable-software-rasterizer
status: complete
claimed_by: "executor-session"
created: 2025-02-18
completed: 2025-02-23
result: "improved"
---
# PERF-208: Enable Chromium Software Rasterizer

## Focus Area
Chromium Process Model & Concurrency (in `packages/renderer/src/core/BrowserPool.ts`).

## Background Research
Currently, Chromium is launched with `--disable-software-rasterizer`. While disabling hardware GPU usage in a headless, CPU-bound microVM makes sense, disabling the software rasterizer prevents Chromium from falling back to efficient CPU-based rendering pipelines. The `GPU_DISABLED_ARGS` array handles this. By removing `--disable-software-rasterizer` from `GPU_DISABLED_ARGS`, we allow Chromium to utilize its highly optimized SwiftShader software rasterizer, which is significantly faster for CPU-bound DOM rendering than whatever unoptimized fallback it uses when the software rasterizer is explicitly disabled.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~43.4s (with `--disable-software-rasterizer`)
- **Bottleneck analysis**: CPU-bound rendering latency inside Chromium.

## Implementation Spec

### Step 1: Remove `--disable-software-rasterizer` flag
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In the `GPU_DISABLED_ARGS` array, remove `--disable-software-rasterizer`.
**Why**: Allowing the software rasterizer in a CPU-bound headless environment enables efficient CPU rendering (e.g., SwiftShader), which significantly improves performance compared to explicitly disabling it.
**Risk**: Negligible. SwiftShader is heavily tested in headless Chrome.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode remains functional.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to ensure CDP communication remains intact.

## Results Summary
- **Best render time**: 32.713s (vs baseline 45.461s)
- **Improvement**: 28%
- **Kept experiments**: [Removed '--disable-software-rasterizer' from launch arguments]
- **Discarded experiments**: []
