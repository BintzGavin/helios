---
id: PERF-214
slug: swiftshader
status: complete
claimed_by: "executor"
created: 2024-05-24
completed: "2024-05-24"
result: "kept"
---
## Results Summary
- **Best render time**: 32.595s
- **Improvement**: 1.7%
- **Kept experiments**: Removed `--disable-gpu-compositing` to enable SwiftShader compositing
- **Discarded experiments**: none

# PERF-214: Remove `--disable-gpu-compositing` to Enable SwiftShader Compositor

## Focus Area
Browser Architecture / Process Flags

The rendering pipeline heavily relies on headless Chromium to composite and capture frames. In a CPU-bound microVM environment without a hardware GPU, we currently run Chromium with `--disable-gpu` and `--disable-gpu-compositing`.

In `PERF-208`, we discovered that removing `--disable-software-rasterizer` allowed Chromium to fall back to SwiftShader (its highly optimized software Vulkan/OpenGL implementation) for rasterization, yielding a massive 28% performance improvement (~45.4s to ~32.7s) over the default CPU Skia fallback.

However, we are still explicitly passing `--disable-gpu-compositing`. This flag forces Chromium to bypass the GPU compositor entirely and use a basic CPU compositor. By removing this flag, we will allow Chromium to use SwiftShader for both rasterization *and* compositing. Given SwiftShader's aggressive multi-threading and vectorization optimizations, moving compositing to SwiftShader could yield another significant reduction in DOM rendering time.

## Background Research
Chromium's rendering pipeline consists of rasterization (drawing elements into bitmaps) and compositing (assembling these bitmaps into the final frame).
- `--disable-gpu` disables hardware GPU acceleration.
- `--disable-software-rasterizer` (removed in PERF-208) disables SwiftShader rasterization.
- `--disable-gpu-compositing` forces CPU compositing, disabling SwiftShader compositing.

When hardware GPU is unavailable, SwiftShader serves as a highly performant CPU-based drop-in replacement. By retaining `--disable-gpu-compositing`, we are currently handicapping the compositing phase by forcing it onto the unoptimized CPU path. Removing this flag will unblock the full SwiftShader pipeline.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30 FPS, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.710s
- **Bottleneck analysis**: The compositor is currently forced onto a less optimized CPU path due to the presence of `--disable-gpu-compositing`, causing unnecessary CPU overhead during the hot capture loop.

## Implementation Spec

### Step 1: Remove `--disable-gpu-compositing` from `GPU_DISABLED_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Locate the `GPU_DISABLED_ARGS` array:
```typescript
const GPU_DISABLED_ARGS = [
  '--disable-gpu',
  '--disable-gpu-compositing',
];
```
Modify it to remove `--disable-gpu-compositing`:
```typescript
const GPU_DISABLED_ARGS = [
  '--disable-gpu',
];
```
**Why**: This allows Chromium to use SwiftShader for compositing the final frames, leveraging its highly optimized vectorization and threading instead of the basic CPU compositor.
**Risk**: If SwiftShader's compositor has a higher overhead than the basic CPU compositor for simple DOM scenes, performance could slightly degrade. If this occurs, the experiment will be marked as `no-improvement` and reverted.

## Variations
### Variation A: Remove `--disable-gpu` Entirely
If removing `--disable-gpu-compositing` improves performance, a follow-up variation would be to empty the `GPU_DISABLED_ARGS` array entirely, allowing Chromium to handle the software fallback automatically without explicit disable flags.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the Canvas path still works and is unaffected by the compositor change.

## Correctness Check
Run the `verify-cdp-driver.ts` and `verify-cdp-determinism.ts` scripts to ensure frame capture timing remains accurate. Run the main suite with `npx tsx packages/renderer/tests/run-all.ts` to catch any regressions.

## Prior Art
- **PERF-208**: Removing `--disable-software-rasterizer` yielded a ~28% speedup by enabling SwiftShader rasterization.
- Chromium graphics stack documentation regarding CPU vs. GPU compositing.
