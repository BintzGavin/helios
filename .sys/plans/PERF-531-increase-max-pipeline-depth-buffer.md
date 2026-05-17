---
id: PERF-531
slug: increase-max-pipeline-depth-buffer
status: complete
claimed_by: "executor-session"
created: 2024-06-01
completed: "2026-05-17"
result: "discarded"
---

# PERF-531: Increase CaptureLoop maxPipelineDepth Buffer

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `run()` method loop orchestration backpressure settings.

## Background Research
The `CaptureLoop` acts as the orchestrator between the multi-worker `BrowserPool` (producing frames via Playwright/CDP) and the `FFmpegManager` (consuming frames). To prevent unbounded memory growth in Node.js if the DOM capture workers produce frames significantly faster than FFmpeg encodes them, it utilizes a backpressure mechanism backed by a ring buffer (`frameBufferRing`).
Currently, the depth of this ring buffer is governed by `maxPipelineDepth`, which is initialized to `poolLen * 8` (and then rounded up to the nearest power of 2). For a typical setup with 3 Chromium workers, `3 * 8 = 24`, which rounds up to 32.
A pipeline depth of 32 means only ~0.5 seconds of video (at 60fps) can be buffered in the Node.js process before the fast-producing Chromium workers are blocked, waiting for FFmpeg to drain the stdin pipe. When FFmpeg experiences a micro-stall (e.g., waiting on OS disk I/O, writing the MP4 atom, or encoding a highly detailed frame), the ring buffer fills instantly, causing the orchestrator to stall all Chromium workers. This leaves the CPU cores idle, degrading parallel throughput.

By significantly increasing the `maxPipelineDepth` multiplier from `8` to `64`, the depth becomes 256 for a 3-worker pool (it rounds up to 256). This allows Node.js to comfortably buffer ~4.2 seconds of video. At ~50KB per JPEG frame, this is only ~12MB of RAM, which is completely negligible in a server environment. This deeper buffer fully absorbs temporary FFmpeg or V8 GC micro-stalls, ensuring the Chromium renderer processes remain fully saturated and constantly producing frames.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~16.306s (from PERF-529 baseline)
- **Bottleneck analysis**: Occasional micro-stalls in the FFmpeg stdin pipe cause backpressure to quickly propagate up to the Chromium worker pool due to the extremely shallow ring buffer (32 frames). This leaves CPU resources idle.

## Implementation Spec

### Step 1: Increase `maxPipelineDepth` multiplier
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Modify the initialization of `maxPipelineDepth` to use a multiplier of `64` instead of `8`.
```typescript
<<<<<<< SEARCH
    const poolLen = this.pool.length;
    let maxPipelineDepth = poolLen * 8;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
=======
    const poolLen = this.pool.length;
    let maxPipelineDepth = poolLen * 64;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
>>>>>>> REPLACE
```
**Why**: A deeper ring buffer decouples the instantaneous capture rate (CPU bound, multi-core parallel) from the instantaneous encoding rate (I/O bound, serial). This ensures that if FFmpeg stalls for a fraction of a second, the Chromium workers can keep rendering frames into the buffer without blocking, maximizing CPU utilization.
**Risk**: Marginal increase in peak Node.js heap memory usage (~10-20MB extra), which is well within safe limits and completely resolves backpressure deadlocks without disabling the backpressure feature entirely.

## Variations
- Test a multiplier of `128` if `64` still shows orchestrator stalls, though `64` should be sufficient for the typical micro-stalls observed.

## Canvas Smoke Test
Run canvas benchmarks (`npm test -w packages/renderer` or equivalent) to ensure no regressions in basic ring buffer logic (the depth is dynamically scaled, so functionality shouldn't change).

## Correctness Check
Run the DOM benchmark and inspect `output.mp4` to verify that all 600 frames were correctly ordered and written without drops.

## Prior Art
- PERF-498 (Restored FFmpeg backpressure to fix OOM on long renders, but introduced tight coupling due to the shallow buffer)
- PERF-524 (Unclaimed earlier hypothesis proposing a similar pipeline depth increase)

## Results Summary
- **Best render time**: 19.206s (vs baseline 15.594s)
- **Improvement**: -23.16%
- **Kept experiments**: none
- **Discarded experiments**: Increased maxPipelineDepth buffer multiplier to 64
