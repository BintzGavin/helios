---
id: PERF-098
slug: buffer-pool-expansion
status: unclaimed
claimed_by: ""
created: 2026-03-29
completed: ""
result: ""
---

# PERF-098: Expand Buffer Pool and Pipeline Depth

## Focus Area
Frame Capture Loop - Worker saturation and Buffer allocation

## Background Research
Currently, `maxPipelineDepth` in `Renderer.ts` is set to `poolLen * 10`, but the `bufferPool` in `DomStrategy.ts` is hardcoded to a static size of 10 buffers. As pipeline depth increases, a worker might process more frames ahead of the sequential ffmpeg write process. If a worker gets more than 10 frames ahead, the `bufferPool` will wrap around (`(this.bufferIndex + 1) % 10`) and overwrite the oldest buffer before it has been completely written to ffmpeg. By safely expanding `bufferPool` to size 20, we can safely expand `maxPipelineDepth` to `poolLen * 15` to better saturate workers. We also hoist the empty `catch(() => {})` closure for `worker.activePromise` outside the hot loop to reduce micro-allocations per frame. (Note: Hoisting the ffmpeg error handler was explicitly observed to cause regressions, so we avoid that).

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition.
- **Render Settings**: Standard benchmark settings.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.394s
- **Bottleneck analysis**: IPC wait time and V8 memory allocations in the hot loop.

## Implementation Spec

### Step 1: Hoist catch closure and expand maxPipelineDepth
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
1. Define `const noopCatch = () => {};` outside the `while (nextFrameToWrite < totalFrames)` loop.
2. Update `worker.activePromise = framePromise.catch(() => {})` to use `.catch(noopCatch)`.
3. Change `const maxPipelineDepth = poolLen * 10;` to `const maxPipelineDepth = poolLen * 15;`.
**Why**: Prevents closure allocation per frame, and allows more concurrent frame captures.

### Step 2: Expand buffer pool in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Change `private bufferPool: Buffer[] = Array.from({ length: 10 }, ...)` to `length: 20`.
2. Update `this.bufferIndex = (this.bufferIndex + 1) % 10;` to `% 20`.
**Why**: Prevents workers from overwriting their statically allocated decode buffers while ffmpeg is still processing them.

## Correctness Check
Run benchmark and verify video output is not corrupted.
