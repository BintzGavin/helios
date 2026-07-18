---
id: PERF-1038
slug: unroll-writer-loop-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1038: Isolate multi-worker DOM and Canvas writer loops completely

## Focus Area
The multi-worker frame rendering main chunk writer loop in `packages/renderer/src/core/CaptureLoop.ts` (around lines 870-950).

## Background Research
In the multi-worker paths, `CaptureLoop.ts` has a top-level `isDomStrategyWriter` check inside the writer routine. However, the outer loop `while (nextFrameToWrite < totalFrames && !aborted)` wraps the entire dispatch logic AND the inner writer loop logic.

```typescript
      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
            while (nextFrameToWrite < totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              // ... worker dispatches ...

              if (isDomStrategyWriter) {
                while (nextFrameToWrite < chunkEnd) {
                  // ... read from ring, stream write (Buffer)
                }
              } else {
                while (nextFrameToWrite < chunkEnd) {
                  // ... read from ring, stream write (any)
                }
              }

              // ... wait logic ...
            }
        }
```
Although `isDomStrategyWriter` was previously unrolled out of the inner writer loop, the V8 TurboFan compiler still compiles this entire massive `while` loop block into a single AST with a conditional branch in the middle. The loop boundary includes worker dispatches, branch evaluations for strategy, inner loops, and a waiter promise.

By pulling the `if (isDomStrategyWriter)` completely OUTSIDE the main `while (nextFrameToWrite < totalFrames && !aborted)` loop, we duplicate the outer loop logic into two entirely independent and strict execution paths.
- The `isDomStrategyWriter === true` path will contain only DOM-specific logic.
- The `isDomStrategyWriter === false` path will contain only Canvas-specific logic.
This splits the AST for the V8 JIT, lowering the peak complexity score for the hot loop compilation and ensuring that the branch predictor is perfectly stable for the entire render duration.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The mega-loop for multi-worker writers contains both DOM and Canvas inner loops and worker dispatches, leading to high parsing overhead and V8 optimization bailouts due to AST block size.

## Implementation Spec

### Step 1: Hoist `isDomStrategyWriter` outside the outer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer logic (around lines 870-960), hoist the `if (isDomStrategyWriter)` up to wrap the entire `while` loop block.
```typescript
      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          if (isDomStrategyWriter) {
            while (nextFrameToWrite < totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                const limit = Math.min(maxSubmits, totalFrames);
                let dispatches = limit - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = Math.min(dispatches, freeWorkersHead);
                  let h = freeWorkersHead;
                  let n = nextFrameToSubmit;
                  for (let d = 0; d < dispatches; d++) {
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
                }
                if (nextFrameToSubmit === totalFrames) {
                  for (let j = 0; j < freeWorkersHead; j++) {
                    const w = freeWorkers[j];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
                }
              }

              while (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex] as unknown as Buffer;
                pendingBytes += buffer.length;
                const writeSuccess = stream.write(buffer);

                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }

              if (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                while (frameBufferRing[ringIndex] === null && !aborted) {
                  await writerWaiterPromise;
                }
                if (aborted) break;
              } else if (aborted) {
                break;
              }

              if (nextFrameToWrite === nextProgress) {
                nextProgress += progressInterval;
                console.log(`Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`);
                if (onProgress) onProgress(nextFrameToWrite / totalFrames);
              }
            }
          } else {
            while (nextFrameToWrite < totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                const limit = Math.min(maxSubmits, totalFrames);
                let dispatches = limit - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = Math.min(dispatches, freeWorkersHead);
                  let h = freeWorkersHead;
                  let n = nextFrameToSubmit;
                  for (let d = 0; d < dispatches; d++) {
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
                }
                if (nextFrameToSubmit === totalFrames) {
                  for (let j = 0; j < freeWorkersHead; j++) {
                    const w = freeWorkers[j];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
                }
              }

              while (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex]!;
                pendingBytes += (buffer as any).length;
                const writeSuccess = stream.write(buffer as any);

                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }

              if (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                while (frameBufferRing[ringIndex] === null && !aborted) {
                  await writerWaiterPromise;
                }
                if (aborted) break;
              } else if (aborted) {
                break;
              }

              if (nextFrameToWrite === nextProgress) {
                nextProgress += progressInterval;
                console.log(`Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`);
                if (onProgress) onProgress(nextFrameToWrite / totalFrames);
              }
            }
          }
        }
```

## Variations
- If code duplication exceeds typical module complexity limits, we might need to inline the dispatch logic. However, given `CaptureLoop.ts` is a hot-loop execution module, TurboFan compilation takes precedence over AST brevity here.

## Correctness Check
Run general tests: `npm run test -w packages/renderer`.
