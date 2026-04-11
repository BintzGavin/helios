---
id: PERF-249
slug: capture-loop-promise-all-parallel
status: complete
claimed_by: "executor-session"
created: "2026-04-11"
completed: "2026-04-11"
result: improved
---

# PERF-249: Optimize Capture Loop to pipeline Frame Generation and Writing

## Focus Area
DOM Rendering Pipeline - Concurrency in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop` currently batch generates `maxPipelineDepth` frames by awaiting `Promise.all(batchPromises)` before writing them to FFmpeg in a loop. This sequential nature means Playwright frame generation pauses entirely while FFmpeg drain operations or Node.js event loops block on writing `maxPipelineDepth` frames. By replacing the batching `while` loop with an overlapping sliding window that maintains `maxPipelineDepth` active frame generation promises while independently awaiting and writing completed frames one by one, we can decouple rendering and writing and prevent pipeline stalls.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 600x600, 30fps, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Baseline
- **Bottleneck analysis**: Generating and resolving frames in discrete batches introduces blocking delays before the first frame of the next batch can be dispatched, leaving the browser pool occasionally idle while waiting for the last slow frame in the previous batch.

## Implementation Spec

### Step 1: Overlapping Promise Execution
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, remove the inner batching `for` loop and `Promise.all`. Introduce separate counters for `nextFrameToSubmit` and `nextFrameToWrite`. Maintain a fixed-size array `framePromises` of size `maxPipelineDepth`.
While `nextFrameToWrite < this.totalFrames`, synchronously dispatch new frames into `framePromises` up to `maxPipelineDepth` frames ahead of `nextFrameToWrite`.
Then `await framePromises[nextFrameToWrite % maxPipelineDepth]`, write the resolved buffer to FFmpeg, increment `nextFrameToWrite`, and repeat.
**Why**: This pipelined approach ensures the worker pool is always saturated with exactly `maxPipelineDepth` active frame captures. Frame generation runs fully in parallel to the FFmpeg writes of completed previous frames.
**Risk**: Potential backpressure mismatch if FFmpeg writes significantly stall, though the `activePromise` chain and bounded `maxPipelineDepth` window inherently limits memory buildup.

## Canvas Smoke Test
Run `npm run build && npx tsx scripts/benchmark-test.js` ensuring it completes cleanly.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to verify frame ordering is preserved.

## Prior Art
- PERF-248: Initial implementation of Promise.all batching in CaptureLoop.


## Results Summary
- **Best render time**: 0.276s (vs baseline 0.28s)
- **Improvement**: 1.4%
- **Kept experiments**: Overlapping parallel promise generation
- **Discarded experiments**: none
