---
id: PERF-1044
slug: dynamic-pipeline-depth-evaluation
status: complete
claimed_by: ""
created: 2024-07-18
completed: ""
result: ""
---

# PERF-1044: Eliminate stale pipeline depth caching in multi-worker ACTOR loops

## Focus Area
The multi-worker task acquisition loops within `runWorker` in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In the multi-worker ACTOR model, workers continuously grab frame indices (`nextFrameToSubmit`) to process. To prevent outpacing the FFmpeg writer and exhausting memory, they are bounded by a maximum pipeline depth (`nextFrameToWrite + maxPipelineDepth`).

Currently, workers calculate and cache this boundary (`let maxSubmits = nextFrameToWrite + maxPipelineDepth;`) before entering their frame processing loop, and only refresh it when they are forced to yield and wait on `workerThenables`. Because rendering a frame (`await strategy.capture()`) is asynchronous and takes time, the `nextFrameToWrite` pointer advances concurrently in the background as the writer consumes frames. However, because workers rely on their *stale, cached* `maxSubmits` boundary, they will artificially reach their limit and unnecessarily yield to the idle worker queue.

This causes forced V8 Promise resolution overhead and pipeline stalls as the writer loop must frequently wake these workers back up. By evaluating `nextFrameToWrite + maxPipelineDepth` dynamically on every iteration, workers can continuously process frames without yielding as long as the pipeline truly has capacity.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/perf-test`
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary worker yielding and Promise resolution overhead due to stale limit caching.

## Implementation Spec

### Step 1: Remove `maxSubmits` cache in `isDomStrategy` multi-worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `runWorker` function, in the `if (isDomStrategy)` block:
1. Delete the local variable declaration `let maxSubmits = nextFrameToWrite + maxPipelineDepth;`.
2. Update the `while` loop condition check from `if (nextFrameToSubmit < maxSubmits)` to `if (nextFrameToSubmit < nextFrameToWrite + maxPipelineDepth)`.
3. In the `else` block, delete the re-assignment `maxSubmits = nextFrameToWrite + maxPipelineDepth;`.
4. Delete the unused closure variable `let domLastFrameData: any = (strategy as any).lastFrameData;`.
5. Inside the `try` block, remove the redundant `domLastFrameData = data;` assignment and the intermediate `let buffer: any;` variable, directly assigning the result to `frameBufferRing[ringIndex] = buf;`.
**Why**: Ensures workers use the true, up-to-date pipeline depth capacity, preventing them from yielding unnecessarily. Eliminates unused closures.
**Risk**: Dynamic evaluation adds a minimal integer addition, but V8 TurboFan optimizes this efficiently.

### Step 2: Remove `maxSubmits` cache in `!isDomStrategy` multi-worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `runWorker` function, in the `else` block (`!isDomStrategy`):
1. Delete the local variable declaration `let maxSubmits = nextFrameToWrite + maxPipelineDepth;`.
2. Update the check to `if (nextFrameToSubmit < nextFrameToWrite + maxPipelineDepth)`.
3. In the `else` block, delete the re-assignment `maxSubmits = nextFrameToWrite + maxPipelineDepth;`.
4. Inside the `try` block, remove the intermediate `let buffer: any;` variable and assign the capture result directly: `frameBufferRing[ringIndex] = await strategy.capture(page, i * timeStep);`.
**Why**: Same reasoning as Step 1.

## Canvas Smoke Test
Run a standard Canvas mode render to verify that pipeline backpressure and task acquisition work correctly without deadlocking.

## Correctness Check
Run the renderer in DOM mode and verify no skipped frames or hangs occur at the end of the render.

## Prior Art
Builds on prior work that removed dead code and hoisted conditionals, focusing on minimizing multi-worker ACTOR model synchronization overhead.
