---
id: PERF-678
slug: increase-pipeline-depth
status: complete
claimed_by: "Jules"
created: 2024-06-05
completed: "2024-06-05"
result: "kept"
---

# PERF-678: Increase Actor Model Pipeline Depth in CaptureLoop

## Focus Area
The `CaptureLoop.ts` file manages the multi-worker actor model loop where workers push frames to a ring buffer and the writer consumes them.

## Background Research
Currently, the pipeline depth (`maxPipelineDepth`) is dynamically calculated based on the number of workers: `poolLen * 8`, rounded up to the nearest power of 2. Since `BrowserPool.ts` hardcodes `concurrency = 1`, the maximum pipeline depth evaluates to exactly 8.
This means the worker can only render 8 frames ahead of the FFmpeg writer before it hits backpressure and yields execution via a Promise (`workerBlockedExecutors`).
Since base64 string frames are small in memory (a few MBs for 8 frames), the pipeline depth of 8 is artificially low and forces frequent, unnecessary async context switching and Promise resolution overhead between the single rendering worker and the writer loop.
By increasing the pipeline depth to a larger fixed power of two, such as 64, we can allow the worker to batch render more frames continuously without yielding to the backpressure mechanism as often, potentially reducing V8 event loop microtask churn and increasing overall throughput.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s
- **Bottleneck analysis**: Microtask and Promise resolution overhead from frequent backpressure yielding in the CaptureLoop actor model.

## Implementation Spec

### Step 1: Hardcode increased pipeline depth
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the initialization of `maxPipelineDepth`:
```typescript
    const poolLen = this.pool.length;
    let maxPipelineDepth = poolLen * 8;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
```
Change it to a fixed, larger power of 2:
```typescript
    const poolLen = this.pool.length;
    const maxPipelineDepth = 64; // Hardcoded to 64 for optimal continuous batching
```
**Why**: 64 is a power of 2 (required for the bitwise `& ringMask` logic to work) and provides a deep enough buffer to absorb FFmpeg stream backpressure variations without forcing the worker to yield as frequently.
**Risk**: Slightly higher memory usage (64 frames of base64 strings might use ~20-50MB depending on resolution/complexity), which is well within microVM limits.

## Variations
- Try `maxPipelineDepth = 128` if 64 shows promise but still yields.
- Try `maxPipelineDepth = 32` if 64 causes excessive GC pressure.

## Canvas Smoke Test
Run a basic canvas render to ensure the `ringMask` and buffer logic still works correctly.

## Correctness Check
Verify output video opens, plays correctly, and contains the expected number of frames.

## Prior Art
Previous experiments (PERF-666, PERF-672) have targeted allocation overhead in `CaptureLoop.ts`. This targets execution flow and async context switching overhead.

## Results Summary

run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	2.290	150	65.50	62.7	keep	PERF-678: Increase pipeline depth to 64
2	2.753	150	54.49	62.8	keep	PERF-678: Increase pipeline depth to 64
3	2.586	150	58.00	62.7	keep	PERF-678: Increase pipeline depth to 64
4	2.127	150	70.53	63.6	keep	PERF-678: Increase pipeline depth to 64
5	2.402	150	62.46	63.6	keep	PERF-678: Increase pipeline depth to 64
6	2.400	150	62.51	63.6	keep	PERF-678: Increase pipeline depth to 64
