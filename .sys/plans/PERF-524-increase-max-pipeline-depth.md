---
id: PERF-524
slug: increase-max-pipeline-depth
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-524: Increase CaptureLoop maxPipelineDepth

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `run()` method loop orchestration.

## Background Research
The `CaptureLoop` acts as the orchestrator between the multi-worker `BrowserPool` (producing frames) and the `FFmpegManager` (consuming frames). To prevent unbounded memory growth if DOM capture is significantly faster than FFmpeg encoding, it utilizes a backpressure mechanism backed by a ring buffer (`frameBufferRing`).
Currently, the depth of this ring buffer is governed by `maxPipelineDepth`, initialized to `poolLen * 8` (and then rounded up to the nearest power of 2). For a typical setup with 3 workers, `3 * 8 = 24`, rounding up to 32.
A pipeline depth of 32 means only ~0.5 seconds of video (at 60fps) can be buffered in Node.js before the fast-producing workers are blocked, waiting for FFmpeg to drain the stdin pipe. When FFmpeg experiences a micro-stall (e.g., waiting on OS I/O or a dense video frame encoding), the ring buffer fills instantly, causing the orchestrator to stall the Chromium workers. This leaves CPU cores idle, heavily degrading parallel throughput.

By increasing the `maxPipelineDepth` multiplier from `8` to `64`, the depth becomes 256 for a 3-worker pool. This allows Node.js to comfortably buffer ~4.2 seconds of video (at ~50KB per JPEG frame, this is only ~12MB of RAM), fully absorbing temporary FFmpeg or V8 GC micro-stalls and ensuring the Chromium renderer processes remain fully saturated.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~16.471s - 18.523s
- **Bottleneck analysis**: Micro-stalls in the FFmpeg stdin pipe causing backpressure to propagate up to the Chromium worker pool, leaving CPU resources idle.

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
**Why**: A deeper buffer completely decouples the instantaneous capture rate (CPU bound, parallel) from the instantaneous encoding rate (I/O bound, serial), maximizing Chromium worker saturation.
**Risk**: Marginal increase in peak Node.js heap memory usage (~10-20MB extra), which is well within safe limits for this environment.

## Variations
- Test a multiplier of `128` if `64` still shows orchestrator stalls, though `64` should be sufficient for the typical micro-stalls observed in FFmpeg.

## Canvas Smoke Test
Run canvas benchmarks (`npm test -w packages/renderer` or equivalent) to ensure no regressions in basic ring buffer logic.

## Correctness Check
Run the DOM benchmark and inspect `output.mp4` to verify that all 600 frames were correctly ordered and written without drops.

## Prior Art
- PERF-498 (restored FFmpeg backpressure to fix OOM on long renders, but introduced tight coupling)
- PERF-484 (unclaimed scratchpad plan that hypothesized this exact fix)
