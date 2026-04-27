---
id: PERF-370
slug: increase-pipeline-depth
status: unclaimed
claimed_by: ""
created: 2024-05-02
completed: ""
result: ""
---

# PERF-370: Increase CaptureLoop Pipeline Depth

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `maxPipelineDepth`

## Background Research
Currently, `maxPipelineDepth` is set to `poolLen * 2` (rounded up to the next power of 2 for bitwise masking). Since the Jules microVM runs with `poolLen = 3` (on a 4-core machine), `poolLen * 2 = 6`, which rounds up to `8`.
This means the CaptureLoop allows at most 8 frames to be in flight (being captured by workers or waiting to be written to FFmpeg) before applying backpressure and blocking workers.

However, writing to `ffmpegProcess.stdin` is highly asynchronous, and `HeadlessExperimental.beginFrame` execution is bounded by the microVM's CPU cores. If the workers are momentarily blocked waiting for FFmpeg to drain, they drop CPU utilization. Increasing the buffer size (pipeline depth) allows workers to capture frames further ahead into memory, smoothing out I/O spikes and maximizing CPU saturation across all Chromium instances.

If we change `maxPipelineDepth` to `poolLen * 8` (which for 3 workers would be 24, rounding up to `32`), we significantly increase the buffer of frames in flight. A base64 string for a 1080p frame is a few megabytes. Storing 32 frames in memory takes ~100MB, which is well within the memory limits of the microVM (usually several GBs available), but provides a much larger runway to absorb FFmpeg encoding stalls.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, 150 frames, dom mode, png intermediate format
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.058s (PERF-368)

## Implementation Spec

### Step 1: Increase Pipeline Depth Multiplier
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the calculation of `maxPipelineDepth` from `poolLen * 2` to `poolLen * 8`.
```typescript
<<<<<<< SEARCH
    const poolLen = this.pool.length;
    let maxPipelineDepth = poolLen * 2;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
=======
    const poolLen = this.pool.length;
    let maxPipelineDepth = poolLen * 8;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
>>>>>>> REPLACE
```
**Why**: Allows workers to process up to 32 frames ahead of the FFmpeg writer, smoothing out CPU vs I/O spikes and preventing premature worker blocking.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` and ensure benchmark render completes properly.
