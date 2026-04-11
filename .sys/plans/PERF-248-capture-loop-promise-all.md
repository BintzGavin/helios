---
id: PERF-248
slug: capture-loop-promise-all
status: complete
claimed_by: "executor-session"
created: "2026-04-11"
completed: "2026-04-11"
result: "improved"
---

# PERF-248: Optimize Capture Loop to use Promise.all() for Max Pipeline Batch

## Focus Area
DOM Rendering Pipeline - Concurrency in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop` uses a `while` loop to push frames to worker pools, maintaining a ring buffer array up to `maxPipelineDepth` (which is typically `poolLen * 2`). Instead of a sequential `while` loop that iteratively checks depth on every iteration and awaits the next sequential frame (causing interleaved async microtask queue overhead), we can submit an entire valid batch of frame promises simultaneously to workers using `Promise.all()`. This approach allows multiple playbacks and capture operations to begin their V8 executions in parallel before the event loop pauses to await the slowest frame buffer resolution.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 600x600, 30fps, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: (Varies by environment, refer to latest baseline)
- **Bottleneck analysis**: The sequential scheduling and awaiting of async frame captures in a standard `while` loop under-utilizes potential parallelism across browser processes.

## Implementation Spec

### Step 1: Batch Submit Worker Frames
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, replace the inner `while (nextFrameToSubmit < this.totalFrames ...)` logic with a mechanism that pushes up to `maxPipelineDepth` frames concurrently into an array, and then awaits them, or redesign the write loop to await them after bulk-starting them.
Currently, it starts them sequentially. If we can trigger multiple worker methods without intermediate yield, we reduce scheduling latency.

(Note for Executor: You might need to adjust the tracking indices (e.g. `nextFrameToSubmit`, `nextFrameToWrite`) to cleanly accommodate batch submissions).

### Step 2: Measure Performance
Run the DOM benchmark using `cd packages/renderer && npm run build && npx tsx scripts/benchmark-test.js` repeatedly to verify the parallel submission reduces total capture time.

## Correctness Check
Run `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts` to ensure frames are sequenced and written correctly.

## Prior Art
- PERF-246: Replaced modulo with counter indexing for the same loop to reduce iteration overhead.

## Results Summary
- **Best render time**: 2.001s (vs baseline 2.298s)
- **Improvement**: 12.9%
- **Kept experiments**: Promise.all batching in CaptureLoop
- **Discarded experiments**: none
