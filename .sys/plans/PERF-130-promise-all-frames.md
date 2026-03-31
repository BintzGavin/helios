---
id: PERF-130
slug: promise-all-frames
status: complete
claimed_by: "Jules"
created: 2026-03-31
completed: ""
result: "discarded"
---
# PERF-130: Optimize capture loop with Promise.all for workers

## Focus Area
Frame capture hot loop in `packages/renderer/src/Renderer.ts`.

## Background Research
Currently in `Renderer.ts`, the hot loop processes frames sequentially using a `while` loop, refilling the pipeline up to `maxPipelineDepth` by assigning promises to a preallocated array. While workers evaluate concurrently, the loop synchronizes them by awaiting the oldest frame sequentially: `await framePromises[nextFrameToWrite]!`.
Using `Promise.all` over chunks of frames up to the pool length could potentially reduce the overhead of constant event loop ticks and sequential `await` state management in Node.js.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s

## Implementation Spec

### Step 1: Replace sequential await with batch Promise.all
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Refactor the `captureLoop` to process frames in batches equal to the `maxPipelineDepth` or `poolLen`. Instead of pushing and shifting from an array and `await`-ing individual frame promises sequentially, construct an array of promises for the current batch and `await Promise.all(batch)`.

**Why**: Batching with `Promise.all` allows V8 to optimize the wait state across multiple concurrent operations, rather than repeatedly pausing and resuming the execution context for each individual frame.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify DOM rendering succeeds.
