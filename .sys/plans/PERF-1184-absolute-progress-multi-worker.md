---
id: PERF-1184
slug: absolute-progress-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-05-27
completed: ""
result: ""
---

# PERF-1184: Replace Dynamic Relative Progress Tracking with Absolute Target in Multi-Worker Loop

## Focus Area
The multi-worker frame rendering and writing chunk loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, optimizing the `progressCounter` mathematical operations per chunk by replacing it with a fixed absolute `nextProgress` target.

## Background Research
Currently, the multi-worker path uses a relative progress counter that decrements:
```typescript
let progressCounter = progressInterval;
while (nextFrameToWrite !== totalFrames && !aborted) {
  const chunkEnd = Math.min(nextFrameToWrite + progressCounter, totalFrames);
  const startWrite = nextFrameToWrite;
  // ... loop logic ...
  const isProgress = !(progressCounter -= nextFrameToWrite - startWrite);
  if (isProgress) {
      progressCounter = progressInterval;
      // ... progress logging
  }
}
```
This forces V8 to:
1. Load `progressCounter`
2. Evaluate `Math.min(nextFrameToWrite + progressCounter, totalFrames)` per iteration.
3. Keep track of `startWrite` per iteration.
4. Mutate `progressCounter` via `progressCounter -= nextFrameToWrite - startWrite` and evaluate if it hit 0.

By swapping to an absolute `nextProgress` marker (as done successfully in previous single-worker optimizations):
```typescript
let nextProgress = Math.min(progressInterval, totalFrames);
while (nextFrameToWrite !== totalFrames && !aborted) {
  const chunkEnd = nextProgress;
  // ... loop logic ...
  if (nextFrameToWrite === nextProgress) {
      nextProgress = Math.min(nextFrameToWrite + progressInterval, totalFrames);
      // ... progress logging
  }
}
```
We remove the intermediate `startWrite` assignment, remove loop-carried mutations of a relative counter, and simplify the bound calculation to a direct load of `nextProgress`.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard resolution, FPS, duration, `dom` mode
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.700s
- **Bottleneck analysis**: The multi-worker hot path's frame writing loop is executed up to `totalFrames` times. Eliminating variable assignments and arithmetic in the loop boundary overhead reduces AST operations in V8's JIT.

## Implementation Spec

### Step 1: Replace `progressCounter` with `nextProgress`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker loop (`} else {` branch), replace:
```typescript
<<<<<<< SEARCH
      try {
        let progressCounter = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (nextFrameToWrite !== totalFrames && !aborted) {
            const chunkEnd = Math.min(nextFrameToWrite + progressCounter, totalFrames);
            const startWrite = nextFrameToWrite;
=======
      try {
        let nextProgress = Math.min(progressInterval, totalFrames);
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (nextFrameToWrite !== totalFrames && !aborted) {
            const chunkEnd = nextProgress;
>>>>>>> REPLACE
```

### Step 2: Simplify Progress Check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the decrement logic with an absolute equality check:
```typescript
<<<<<<< SEARCH
            const isProgress = !(progressCounter -= nextFrameToWrite - startWrite);

            if (aborted) break;
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              while (frameBufferRing[awaitIndex] === null && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }

            if (isProgress) {
              progressCounter = progressInterval;
              console.log(
                `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
              );
              if (onProgress) onProgress(nextFrameToWrite / totalFrames);
            }
=======
            if (aborted) break;
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              while (frameBufferRing[awaitIndex] === null && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            } else {
              nextProgress = Math.min(nextFrameToWrite + progressInterval, totalFrames);
              console.log(
                `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
              );
              if (onProgress) onProgress(nextFrameToWrite / totalFrames);
            }
>>>>>>> REPLACE
```

## Variations
None. This is a direct port of a known-good optimization pattern from single-worker to multi-worker paths.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode=canvas` to ensure the multi-worker path (used by canvas too) functions without throwing errors.

## Correctness Check
Run `npm run test` (or manually run `packages/renderer/scripts/benchmark-perf.ts --mode=dom`) to ensure that progress is accurately logged and no frames are skipped or frozen.
