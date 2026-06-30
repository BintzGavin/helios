---
id: PERF-879
slug: overlap-dombeginframe-with-base64-decode-multi-worker
status: complete
claimed_by: "executor-session"
created: 2025-02-12
completed: "2026-06-30"
result: "failed"
---

# PERF-879: Overlap domBeginFrame with Base64 Decode in DOM Multi-Worker Paths

## Focus Area
The multi-worker DOM strategy paths in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, optimizing the order of operations so that the browser can render the next frame concurrently while Node.js performs CPU-bound Base64 decoding on the main thread, analogous to the optimizations successfully applied to the single-worker path in PERF-878.

## Background Research
In the multi-worker `CaptureLoop.ts`, the `isDomStrategy` paths that process string outputs (i.e. `hasProcessFn = false` and `hasProcessFn = true` blocks inside the multi-worker `runWorker` loop) currently perform operations serially:
1. `timeDriver.setTime(page, ...)`
2. `let buffer = await domBeginFrame!()` (or `strategy.capture`)
3. Return the buffer to the writer.

The main thread writer loop waits for frames in the `frameBufferRing`, decodes the base64 string, and writes to FFmpeg. If a worker waits for `domBeginFrame()` to complete, then resolves `writerWaiterPromise` to wake the main thread which *then* does Base64 decoding, the browser is sitting idle on that worker while the main thread decodes.

By pre-fetching the next frame *within* the worker loop, we can pipeline the CDP `domBeginFrame` call to execute concurrently with the CPU overhead of processing the current frame in the main thread loop. A microbenchmark simulating this pipelining showed a ~4.4% reduction in loop iteration time (from ~65.5ms to ~62.6ms per block of iterations).

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom` (with multiple workers, e.g. `concurrency: 4`)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The browser and Node.js execute serially across the worker boundary. If a worker waits for `domBeginFrame()` to complete before marking the frame ready, the browser sits idle during the main thread's subsequent base64 decode step.

## Implementation Spec

### Step 1: Pre-fetch next frame in `hasProcessFn = true` multi-worker DOM path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `runWorker` function, inside `if (hasProcessFn) { if (isDomStrategy) { ... } }`, rewrite the worker loop to use a pipeline pattern.

Currently it does:
```typescript
while (!aborted && nextFrameToSubmit < totalFrames) {
  // get i...
  try {
    timeDriver.setTime(page, (startFrame + i) * compTimeStep);
    let buffer: any;
    const rawResult = await domBeginFrame!();
    const data = rawResult.screenshotData;
    if (data) domLastFrameData = data;
    buffer = domLastFrameData;
    frameBufferRing[ringIndex] = buffer;
    frameReadyRing[ringIndex] = 1;
  } catch (e) { ... }
  writerWaiterPromise.resolve();
}
```

Rewrite it to seed the first capture promise *before* the loop, and inside the loop, await the *current* promise, then synchronously trigger the *next* frame's time seek and `domBeginFrame` before passing the current frame to the ring buffer.

```typescript
let i = -1;
let nextCapturePromise: Promise<any> | null = null;

while (!aborted && nextFrameToSubmit < totalFrames) {
  if (i === -1) {
      if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
        i = nextFrameToSubmit++;
      } else {
        freeWorkers[freeWorkersHead++] = workerIndex;
        checkState();
        i = (await workerThenables[workerIndex]) as any as number;
      }
      if (i === -1) break;

      timeDriver.setTime(page, (startFrame + i) * compTimeStep);
      nextCapturePromise = domBeginFrame!();
  }

  const ringIndex = i & ringMask;
  frameReadyRing[ringIndex] = 0;
  frameBufferRing[ringIndex] = null;

  try {
    const rawResult = await nextCapturePromise!;

    // Find next frame index
    let nextI = -1;
    if (nextFrameToSubmit < totalFrames) {
        if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
          nextI = nextFrameToSubmit++;
        } else {
          freeWorkers[freeWorkersHead++] = workerIndex;
          checkState();
          // We can't await here without stalling the pipeline.
          // In this variation, we just wait for the current frame to be written.
        }
    }

    if (nextI !== -1) {
        timeDriver.setTime(page, (startFrame + nextI) * compTimeStep);
        nextCapturePromise = domBeginFrame!();
    }

    const data = rawResult.screenshotData;
    if (data) domLastFrameData = data;
    let buffer: any = domLastFrameData;
    frameBufferRing[ringIndex] = buffer;
    frameReadyRing[ringIndex] = 1;
    i = nextI;
  } catch (e) {
    fatalError = e;
    aborted = true;
    checkState();
  }
  writerWaiterPromise.resolve();

  if (i === -1 && nextFrameToSubmit < totalFrames && !aborted) {
      i = (await workerThenables[workerIndex]) as any as number;
      if (i !== -1) {
          timeDriver.setTime(page, (startFrame + i) * compTimeStep);
          nextCapturePromise = domBeginFrame!();
      }
  }
}
```
*Note*: The above is a conceptual pipeline; the exact logic needs to handle the ring buffer constraints and worker polling correctly so as not to exceed `maxPipelineDepth`.

### Step 2: Pre-fetch next frame in `hasProcessFn = false` multi-worker DOM path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the same pipelining technique to the `hasProcessFn = false` -> `isDomStrategy` loop.

## Variations
**Variation A (Simpler)**: If managing `nextFrameToSubmit` across the `await` boundaries proves too complex or buggy with the ring buffer, an alternative is to just drop the `timePromise` await (which is `undefined` in `isDomStrategy`), but since `isDomStrategy` paths don't even use `timePromise` in multi-worker, there is nothing to drop.

**Variation B**: Let the worker loop remain mostly identical, but immediately trigger the *next* frame's evaluation right after awaiting the current one, *before* returning control to the writer.

## Canvas Smoke Test
Run `npm test -w packages/renderer` to ensure Canvas strategies still work.

## Correctness Check
Run `npm test -w packages/renderer` specifically focusing on `verify-cdp-shadow-dom-sync.ts` and `verify-dom-media-attributes.ts`.

## Results Summary
- **Best render time**: N/A (regression)
- **Improvement**: N/A
- **Kept experiments**: None
- **Discarded experiments**: Pipelined domBeginFrame in Multi-Worker DOM paths
