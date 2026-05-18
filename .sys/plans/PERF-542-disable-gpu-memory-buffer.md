---
id: PERF-542
slug: disable-gpu-memory-buffer
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-542: Disable GPU Memory Buffer Optimization

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Chromium launch arguments.

## Background Research
By default, Chromium allocates shared memory buffers for GPU interaction even when running headlessly without a real GPU (especially on Linux VMs). In our CPU-only rendering pipeline, this can result in additional memory and CPU overhead for buffer creation, mapping, and teardown across renderer processes for every frame. Appending `--disable-gpu-memory-buffer-video-frames` and `--disable-gpu-memory-buffer-compositor-resources` forces Chromium to keep all resources in standard CPU RAM allocations.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.443s
- **Bottleneck analysis**: Unnecessary GPU abstraction layer memory management overhead on CPU-bound microVM.

## Implementation Spec

### Step 1: Append Memory Arguments
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Add `--disable-gpu-memory-buffer-video-frames` and `--disable-gpu-memory-buffer-compositor-resources` to the `GPU_DISABLED_ARGS` array.
**Why**: Avoids setting up unnecessary GPU buffer mapping in our CPU-only context.
**Risk**: Negligible. Chromium has stable CPU fallback paths when these are disabled.

## Variations
None.

## Canvas Smoke Test
None.

## Correctness Check
Run the DOM render benchmark script (`npx tsx packages/renderer/tests/fixtures/benchmark.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
None.
