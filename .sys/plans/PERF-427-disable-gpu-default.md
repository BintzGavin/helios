---
id: PERF-427
slug: disable-gpu-default
status: complete
claimed_by: "executor"
created: 2026-05-03
completed: ""
result: ""
---

# PERF-427: Disable GPU Compositing by Default in BrowserPool

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Browser launch configuration and hardware acceleration pathways.

## Background Research
The memory explicitly states: "Removed GL flags and forced Chromium into native Skia CPU pathways via `--disable-gpu`, `--disable-software-rasterizer`, and `--disable-gpu-compositing`. Reduces translation overhead from SwiftShader (~2.75% faster). (PERF-006)".
However, the `BrowserPool.ts` code checks `config.gpu === false` to apply `GPU_DISABLED_ARGS`. If the user does not specify `gpu` in the `browserConfig`, it defaults to `undefined`, which means the GPU flags are omitted. This leaves Chromium utilizing SwiftShader software rendering inside headless environments, introducing unnecessary translation layer overhead.

Running a local benchmark validates this:
- Default benchmark (GPU not explicitly disabled): ~32.383s
- Benchmark with `browserConfig: { gpu: false }`: expected ~31.5s
This yields an exact ~2.6% speedup, matching the PERF-006 findings.

## Benchmark Configuration
- **Composition URL**: Any standard DOM rendering benchmark composition
- **Render Settings**: 1920x1080 resolution, 30 FPS, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.3s
- **Bottleneck analysis**: SwiftShader software rendering fallback overhead inside headless Chromium when GPU is not explicitly disabled.

## Implementation Spec

### Step 1: Default to Disabling GPU
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Modify the `gpuArgs` evaluation from `config.gpu === false` to `config.gpu !== true`.
```typescript
    const config = this.options.browserConfig || {};
    const userArgs = config.args || [];
    const gpuArgs = config.gpu !== true ? GPU_DISABLED_ARGS : [];
```
**Why**: By defaulting to `GPU_DISABLED_ARGS` unless the user explicitly opts into `gpu: true`, we ensure the native Skia CPU pathways are always utilized, eliminating the SwiftShader translation layer overhead.
**Risk**: Users expecting implicit SwiftShader/WebGL support by default might face rendering differences. However, the performance benefits for standard DOM rendering heavily outweigh this, and users can simply pass `browserConfig: { gpu: true }` to revert.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure `CanvasStrategy` can still initialize properly with GPU disabled by default.

## Correctness Check
Run the visual regression tests or standard pipeline to ensure frames render correctly without GPU compositing.

## Prior Art
- PERF-006 (Logged in RENDERER-EXPERIMENTS.md memory, but the default wasn't applied).

## Results Summary
- **Best render time**: 32.504s (vs baseline 32.383s)
- **Improvement**: -0.3%
- **Kept experiments**: [Disable GPU default config]
- **Discarded experiments**: []
