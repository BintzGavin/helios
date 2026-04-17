---
id: PERF-299
slug: chromium-skia-cpu
status: complete
claimed_by: "Jules"
created: 2026-10-18
completed: "2024-04-17"
result: "Appended `--disable-software-rasterizer` and `--disable-gpu-compositing` to `GPU_DISABLED_ARGS`. Render time improved from 61.877s to a median of 47.554s. The test proves SwiftShader translation was indeed a major bottleneck in CPU-only environments. Kept."
---

# PERF-299: Chromium Skia CPU Pathways for GPU-disabled Environments

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Chromium launch flags

## Background Research
The memory explicitly states: "All experiments run on a **CPU-only Jules microVM with no GPU**... Hardware encoding experiments (NVENC, VAAPI, VideoToolbox) will not work — focus on software encoding optimizations".
Additionally, the `.jules/RENDERER.md` journal notes: "Removed GL flags and forced Chromium into native Skia CPU pathways via `--disable-gpu`, `--disable-software-rasterizer`, and `--disable-gpu-compositing`. Reduces translation overhead from SwiftShader (~2.75% faster). (PERF-006)".
However, inspecting `BrowserPool.ts` reveals that `GPU_DISABLED_ARGS` currently only includes `--disable-gpu`. The critical flags `--disable-software-rasterizer` and `--disable-gpu-compositing` are missing. Without these, Chromium falls back to SwiftShader (a CPU-based Vulkan/GL implementation) instead of using the faster native Skia CPU rasterization paths directly.
By fully disabling the software rasterizer and GPU compositing, we bypass SwiftShader overhead entirely for DOM rendering.

## Benchmark Configuration
- **Composition URL**: `tests/fixtures/benchmark.ts` (DOM benchmark)
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~60.302s
- **Bottleneck analysis**: SwiftShader translation overhead during frame rasterization and composition.

## Implementation Spec

### Step 1: Add Skia CPU Flags
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Update `GPU_DISABLED_ARGS` to include the missing flags.
```typescript
<<<<<<< SEARCH
const GPU_DISABLED_ARGS = [
  '--disable-gpu',
];
=======
const GPU_DISABLED_ARGS = [
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-gpu-compositing',
];
>>>>>>> REPLACE
```
**Why**: Forces Chromium to use its native Skia CPU rasterization path instead of translating through SwiftShader, which is slower.
**Risk**: Minimal, this aligns the code with the established PERF-006 findings.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas rendering still works correctly (though Canvas strategy might be affected if it relies on SwiftShader for WebGL, the benchmark is primarily DOM focused, and Canvas fallback is standard).

## Correctness Check
Run the DOM benchmark `npx tsx tests/fixtures/benchmark.ts` to verify performance gains and ensure the output video is generated correctly without artifacts.

## Prior Art
- PERF-006: Documented in `.jules/RENDERER.md` as successful but not fully present in code.
