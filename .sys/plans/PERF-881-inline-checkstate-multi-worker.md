---
id: PERF-881
slug: inline-checkstate-multi-worker
status: unclaimed
claimed_by: ""
created: 2025-02-12
completed: ""
result: ""
---

# PERF-881: Inline checkState in CaptureLoop Multi-Worker Paths

## Focus Area
The multi-worker DOM strategy paths in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, optimizing the `checkState()` function calls by manually inlining the condition logic into the worker write loops.

## Background Research
In `CaptureLoop.ts`, the multi-worker path uses a closure function `checkState()` to assign tasks to idle workers and manage the ring buffer's backpressure. This function is invoked frequently during the capture loop (both inside the worker frame retrieval loop when a worker is free, and in the main thread write loop when `freeWorkersHead > 0`).

Microbenchmarks show that calling a closure function inside a hot loop is slower than having the same logic executed directly inline due to V8's function invocation overhead. By manually inlining the core logic of `checkState` directly where it is heavily called (such as inside the main thread's `freeWorkersHead > 0` branch and the worker's frame evaluation block), we can eliminate this synchronous call overhead.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom` (with multiple workers)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Synchronous function call overhead in the fast-path multi-worker loops.
- **Microbenchmark results**: A mock loop making 10M closure function calls took ~40ms, whereas inlined execution of the same logic took ~22ms.

## Implementation Spec

### Step 1: Inline `checkState` in worker frame evaluation paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function, wherever `checkState()` is called (e.g. when `nextFrameToSubmit - nextFrameToWrite >= maxPipelineDepth`), replace the function call with the direct logic of `checkState`.

```typescript
// Replace:
freeWorkers[freeWorkersHead++] = workerIndex;
checkState();

// With:
freeWorkers[freeWorkersHead++] = workerIndex;
if (capturedErrors.length > 0 || (signal && signal.aborted)) {
  aborted = true;
}

if (aborted) {
  while (freeWorkersHead > 0) {
    const w = freeWorkers[--freeWorkersHead];
    workerThenables[w].resolve(-1);
  }
  writerWaiterPromise.resolve();
} else {
  while (
    freeWorkersHead > 0 &&
    nextFrameToSubmit < totalFrames &&
    nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth
  ) {
    const w = freeWorkers[--freeWorkersHead];
    const n = nextFrameToSubmit++;
    const ringIndex = n & ringMask;
    frameReadyRing[ringIndex] = 0;
    frameBufferRing[ringIndex] = null;
    workerThenables[w].resolve(n);
  }
  if (nextFrameToSubmit >= totalFrames) {
    while (freeWorkersHead > 0) {
      const w = freeWorkers[--freeWorkersHead];
      workerThenables[w].resolve(-1);
    }
  }
}
```

### Step 2: Inline `checkState` in the main thread write loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the main thread write loop, replace `if (freeWorkersHead > 0) checkState();` with the inlined logic.
```typescript
if (freeWorkersHead > 0) {
  if (capturedErrors.length > 0 || (signal && signal.aborted)) {
    aborted = true;
  }
  if (aborted) {
    while (freeWorkersHead > 0) {
      const w = freeWorkers[--freeWorkersHead];
      workerThenables[w].resolve(-1);
    }
    writerWaiterPromise.resolve();
  } else {
    while (
      freeWorkersHead > 0 &&
      nextFrameToSubmit < totalFrames &&
      nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth
    ) {
      const w = freeWorkers[--freeWorkersHead];
      const n = nextFrameToSubmit++;
      const ringIndex = n & ringMask;
      frameReadyRing[ringIndex] = 0;
      frameBufferRing[ringIndex] = null;
      workerThenables[w].resolve(n);
    }
    if (nextFrameToSubmit >= totalFrames) {
      while (freeWorkersHead > 0) {
        const w = freeWorkers[--freeWorkersHead];
        workerThenables[w].resolve(-1);
      }
    }
  }
}
```
*(The original `checkState` function declaration can be left as-is for initialization or generic abortion listeners.)*

## Variations
- **Variation A**: Completely remove the closure function `checkState` and duplicate its code everywhere it is used.

## Canvas Smoke Test
Run `npm test -w packages/renderer` to ensure Canvas rendering still works.

## Correctness Check
Run `npm test -w packages/renderer` to ensure multi-worker paths behave correctly and terminate successfully on both success and error paths.
