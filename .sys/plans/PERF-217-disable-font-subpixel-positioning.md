---
id: PERF-217
slug: disable-font-subpixel-positioning
status: claimed
claimed_by: "executor-session"
created: 2024-06-03
completed: 2024-06-03
result: "discarded"
---

# PERF-217: Disable Font Subpixel Positioning

## Focus Area
DOM Rendering Pipeline - Chromium Compositor overhead in `BrowserPool.ts`.

## Background Research
When generating frames in a headless, CPU-bound environment, text rendering can be a surprisingly heavy operation. Chromium by default uses font subpixel positioning, which renders text at fractional pixel coordinates for smoother appearance on LCD screens. Since our output is video and we are using software rasterization (`SwiftShader`), disabling subpixel positioning (`--disable-font-subpixel-positioning`) might significantly reduce the CPU cycles spent in the Skia text rendering paths during the `HeadlessExperimental.beginFrame` layout/paint cycle.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s
- **Bottleneck analysis**: The Playwright/Chromium CDP frame capture (`HeadlessExperimental.beginFrame`) is CPU-bound. Reducing layout/paint complexity directly improves performance.

## Implementation Spec

### Step 1: Add flag to `DEFAULT_BROWSER_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Add `'--disable-font-subpixel-positioning'` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: Disabling subpixel text rendering simplifies the rendering pipeline in software mode.
**Risk**: Text might look slightly different (e.g., aliased or differently spaced), but usually acceptable for video renders, especially if it provides a measurable speedup.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`.

## Correctness Check
Run the DOM render tests to ensure no visual regressions break tests.
## Results Summary
- **Best render time**: 43.842s (vs baseline ~32.6s)
- **Improvement**: Regressed
- **Kept experiments**: None
- **Discarded experiments**: Adding `--disable-font-subpixel-positioning` to BrowserPool.ts
