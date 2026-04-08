---
id: PERF-218
slug: disable-lcd-text
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-218: Disable LCD Text Antialiasing

## Focus Area
DOM Rendering Pipeline - Chromium Compositor text rendering overhead in `BrowserPool.ts`.

## Background Research
In the headless CPU-only environment running `SwiftShader`, text rendering with LCD antialiasing is an expensive path in Skia. We already know that software rasterizer CPU overhead is the main bottleneck during `HeadlessExperimental.beginFrame`. Passing `--disable-lcd-text` tells Chromium to avoid the complex LCD-optimized text rendering path, falling back to simpler grayscale antialiasing or no antialiasing, which significantly reduces pixel shader and rasterization workload.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s
- **Bottleneck analysis**: The Playwright/Chromium CDP frame capture is bound by software rasterization in SwiftShader. Reducing subpixel/LCD text complexities directly mitigates this.

## Implementation Spec

### Step 1: Add flag to `DEFAULT_BROWSER_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Add `'--disable-lcd-text'` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: Disabling LCD text reduces CPU cycles spent on text rasterization inside SwiftShader.
**Risk**: Text may look less crisp on output, but for video encoding (which inherently applies chroma subsampling like yuv420p anyway), the visual difference is negligible while the performance gain could be measurable.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/run-all.ts`.

## Correctness Check
Run the DOM render tests to ensure no visual regressions break tests.
