---
id: PERF-1041
slug: isolate-multi-worker-writer-loops
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1041: Isolate multi-worker writer loops completely based on strategy

## Focus Area
The multi-worker frame rendering main chunk writer loop in `packages/renderer/src/core/CaptureLoop.ts` (around lines 922-1010).

## Background Research
Currently, the multi-worker chunk loop wraps its dispatch, polling, and writer logic in a monolithic `while (nextFrameToWrite < totalFrames && !aborted)`. The inner write processing uses `if (isDomStrategyWriter)` to branch to the appropriate buffer stream write method logic. This forces V8 to evaluate complex loop states.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 TurboFan compiler must process unused strategy chunks.

## Implementation Spec

### Step 1: Hoist `isDomStrategyWriter` out of the main multi-worker `while` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker block (after `const workerPromises = ...`), there is a loop:
```typescript
      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
            while (nextFrameToWrite < totalFrames && !aborted) {
               // ...
               if (isDomStrategyWriter) { ... } else { ... }
               // ...
            }
        }
      } catch (e) {
```

Refactor it to hoist the `if (isDomStrategyWriter)` check completely out of the `while (nextFrameToWrite < totalFrames && !aborted)` loop:
```typescript
      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          if (isDomStrategyWriter) {
            while (nextFrameToWrite < totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              // ... worker dispatches ...

              while (nextFrameToWrite < chunkEnd) {
                // DOM writer block
              }

              // ... wait logic ...
            }
          } else {
            while (nextFrameToWrite < totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              // ... worker dispatches ...

              while (nextFrameToWrite < chunkEnd) {
                // Canvas writer block
              }

              // ... wait logic ...
            }
          }
        }
      } catch (e) {
```

Remove the inner `if (isDomStrategyWriter)` completely from both unrolled blocks, using just the respective DOM and Canvas loops.

## Correctness Check
Run general tests: `npm run test -w packages/renderer`.
