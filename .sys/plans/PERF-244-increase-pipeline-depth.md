---
id: PERF-244
slug: increase-pipeline-depth
status: unclaimed
claimed_by: ""
created: "2026-04-11"
completed: ""
result: ""
---

# PERF-244: Increase Pipeline Depth to Maximize Concurrency

## Focus Area
DOM Rendering Pipeline - `CaptureLoop.ts`

## Background Research
Currently, the `CaptureLoop` ring buffer bounds the maximum number of in-flight frames to `maxPipelineDepth`, which is calculated as the next power of two of `poolLen * 2`. For a typical CPU with 8 cores, `poolLen` (concurrency) is 4, resulting in a `maxPipelineDepth` of 8. For 2 cores, it's 4.

This means Node.js will only ever keep a maximum of 4 to 8 frames in flight across the Playwright workers before waiting for the FFmpeg stream to drain. In a CPU-bound microVM, Playwright/Chromium rendering might experience jitter, and FFmpeg encoding can stall. A deeper pipeline allows Node.js to push more `beginFrame` CDP commands into the Chromium queue and buffer more frames, smoothing out the jitter between the renderer and the encoder.

Increasing the multiplier from `2` to `8` will yield a much deeper pipeline (e.g., 32 or 64 frames), allowing the fast Node.js event loop to stay further ahead of the slower FFmpeg encoding process, fully utilizing the FFmpeg `thread_queue_size`.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: (Varies by environment, refer to latest baseline in RENDERER-EXPERIMENTS.md)
- **Bottleneck analysis**: IPC synchronization and pipeline stalling between Playwright and FFmpeg.

## Implementation Spec

### Step 1: Increase Pipeline Depth Multiplier
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the calculation of `maxPipelineDepth` by updating the multiplier.

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
**Why**: Increases the ring buffer size and allows more asynchronous CDP commands and frame promises to be queued in flight, smoothing out CPU stalls.
**Risk**: Slightly higher memory usage due to caching more base64 strings/buffers in memory before writing to FFmpeg.

## Variations
- Try a multiplier of 16 if 8 shows improvement.

## Canvas Smoke Test
N/A

## Correctness Check
Run the DOM render tests to ensure pipeline ordering is maintained correctly.

## Prior Art
- PERF-233, PERF-234, PERF-236 (Ring buffer implementations)
