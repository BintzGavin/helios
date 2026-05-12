---
id: PERF-484
slug: increase-pipeline-depth
status: unclaimed
claimed_by: ""
created: 2026-05-12
completed: ""
result: ""
---
# PERF-484: Increase CaptureLoop maxPipelineDepth

## Focus Area
The `CaptureLoop` ring buffer depth in `CaptureLoop.ts` limits how far ahead the DOM capture workers can run compared to the FFmpeg stdin writer. Increasing this buffer depth reduces backpressure stalls.

## Background Research
Currently, `maxPipelineDepth` is set to `poolLen * 8` (rounded to the next power of 2). For a typical local setup with 4 CPUs, `poolLen` is 3, making the depth 32. During micro-stalls in FFmpeg processing or V8 garbage collection, the workers can quickly hit this limit and stall waiting for `drainPromiseExecutor`. By significantly increasing the multiplier (e.g., to 64), the pipeline depth increases (e.g., to 256 or 512), allowing the DOM workers to continuously capture frames without blocking, absorbing temporary jitter in the Node.js event loop or FFmpeg pipe.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.515s
- **Bottleneck analysis**: IPC latency and FFmpeg pipe backpressure stalls.

## Implementation Spec

### Step 1: Increase maxPipelineDepth multiplier
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the initial assignment of `maxPipelineDepth` from:
```typescript
let maxPipelineDepth = poolLen * 8;
```
to:
```typescript
let maxPipelineDepth = poolLen * 64;
```
**Why**:
This increases the ring buffer size. A deeper pipeline allows the DOM workers to run further ahead of the `ffmpegManager.stdin` write drain events, smoothing out micro-stalls.
**Risk**:
Slightly increased peak memory usage for storing the intermediate frame buffers/strings in `frameBufferRing`, but each frame payload is small enough that this will not exceed Node's heap limit.

## Variations
- Test a multiplier of 32 or 128 if 64 shows memory pressure.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure FFmpeg video output remains valid and frames are not dropped.