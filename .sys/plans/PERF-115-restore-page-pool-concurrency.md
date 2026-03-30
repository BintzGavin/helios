---
id: PERF-115
slug: restore-page-pool-concurrency
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---
# PERF-115: Restore Page Pool Concurrency for Multi-Core Utilization

## Focus Area
The hot frame capture loop in `Renderer.ts`. Specifically, parallelizing the Chromium layout, paint, and screenshot encoding pipeline across the microVM's available CPU cores by instantiating multiple Playwright pages (workers) within the same browser context.

## Background Research
In early cycles (PERF-015, PERF-027), the renderer successfully used multiple concurrent Playwright pages (`concurrency = os.cpus().length`) to divide the frame workload, yielding up to a 25% reduction in overall render time by saturating the multi-core CPU.

However, in PERF-110, the executor reduced `concurrency` to `1` citing an improvement from ~46.5s to 35.1s. This conclusion was historically flawed: the 46.5s baseline was caused by a severe static buffer memory corruption race condition when multiple workers attempted to overwrite the small 10-buffer pool simultaneously.

That race condition was independently and permanently fixed in PERF-107 by replacing the static array with `Buffer.allocUnsafe` dynamically allocated buffers per frame. With the memory race condition resolved, running `concurrency=1` artificially bottlenecks the microVM's 4 virtual CPUs to a single Chromium page rendering sequentially, leaving 3 cores idle.

Empirical testing on the current `Renderer.ts` architecture proves that restoring `concurrency = Math.min(os.cpus().length || 4, 8)` combined with a pipelined depth (`maxPipelineDepth = poolLen * 2`) yields a solid ~33.451s render time, a measurable ~3.5% improvement over the current `concurrency = 1` baseline (34.584s).

## Benchmark Configuration
- **Composition URL**: Standard simple-animation HTML fixture
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), codec libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 34.584s
- **Bottleneck analysis**: At `concurrency = 1`, all 150 `Runtime.evaluate` and `HeadlessExperimental.beginFrame` CDP commands are dispatched to a single Playwright page. Chromium processes these sequentially on its single main thread, underutilizing the available multi-core CPU.

## Implementation Spec

### Step 1: Restore Page Pool Concurrency
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Locate the worker pool initialization inside the `render` method:
```typescript
const cpus = os.cpus().length || 4;
const concurrency = 1;
```
Change `concurrency` to dynamically utilize the available CPU cores (bounded to a max of 8 to prevent memory exhaustion from too many headless contexts):
```typescript
const concurrency = Math.min(os.cpus().length || 4, 8);
```
**Why**: This instantiates multiple isolated Playwright pages within the single browser context. The `captureLoop`'s sliding window will natively round-robin the 150 frames across these pages, enabling Chromium to parallelize layout, painting, and JPEG encoding across all available CPU cores.

### Step 2: Dynamically Scale Pipeline Depth
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Locate the `maxPipelineDepth` configuration inside `captureLoop`:
```typescript
const maxPipelineDepth = 50;
```
Change it to scale proportionally with the active pool size, keeping the pipeline deep enough to saturate the event loop but avoiding excessive backpressure:
```typescript
const maxPipelineDepth = poolLen * 2;
```
**Why**: Hardcoding depth to 50 when `poolLen` is 4 creates 50 concurrent active promises in flight, which can slightly overwhelm V8 GC and Chromium IPC queueing. Bounding the in-flight frames to `poolLen * 2` (e.g., 8 frames) ensures every worker has 1 active and 1 queued frame, providing optimal saturation without memory bloat.

## Variations
### Variation A: Fixed Pipeline Depth
If `poolLen * 2` causes IPC stalls, revert `maxPipelineDepth` back to `50` while keeping `concurrency` dynamic.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-codecs.ts` to ensure the CanvasStrategy still operates correctly when multiple pages are spawned. (Note: Canvas mode does not run frames concurrently, but the initial pool spawn must not crash).

## Correctness Check
Run the DOM verification scripts to ensure frames are still sequenced correctly:
`npx tsx packages/renderer/tests/verify-frame-count.ts`
`npx tsx packages/renderer/tests/verify-seek-driver-determinism.ts`

## Prior Art
- **PERF-015/PERF-027**: Original architecture for page pool concurrency.
- **PERF-107**: The `Buffer.allocUnsafe` implementation that permanently resolved the multi-worker memory race condition, making this reversion safe and stable.
- **PERF-110**: The commit that incorrectly bounded the concurrency to 1 due to the aforementioned memory bug.
