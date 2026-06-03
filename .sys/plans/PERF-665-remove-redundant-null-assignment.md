---
id: PERF-665
slug: remove-redundant-null-assignment
status: complete
claimed_by: "executor-session"
created: 2024-06-03
completed: 2024-06-03
result: no-improvement
---

# PERF-665: Remove explicit null assignments from local variables in CaptureLoop to reduce bytecode

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `checkState` and `runWorker`

## Background Research
In `checkState` and `runWorker` of `CaptureLoop.ts`, when we assign a new frame to a worker, we pre-clear the arrays:
```typescript
            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;
```
However, setting `frameBufferRing[ringIndex] = null;` is redundant. `runWorker` unconditionally overwrites this ring buffer index with the captured frame buffer (or the fallback buffer if an error occurs) in the very same frame execution loop before `frameReadyRing` is set back to 1:
```typescript
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
```
By removing the redundant `frameBufferRing[ringIndex] = null;` assignment inside `checkState` and `runWorker`, we can save an array assignment operation inside the hottest loop, slightly reducing overhead and GC pressure. The old buffer reference will simply be overwritten when the new frame arrives.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.755s
- **Bottleneck analysis**: Unnecessary property assignments inside V8 hot loops.

## Implementation Spec

### Step 1: Remove redundant `frameBufferRing` null assignments
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `checkState()`:
```typescript
<<<<<<< SEARCH
            const i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;

            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;

            res(i);
=======
            const i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;

            frameReadyRing[ringIndex] = 0;

            res(i);
>>>>>>> REPLACE
```

In `runWorker()`:
```typescript
<<<<<<< SEARCH
            } else if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameReadyRing[ringIndex] = 0;
                frameBufferRing[ringIndex] = null;
            } else {
                i = await new Promise<number>(workerBlockedExecutors[workerIndex]);
            }
=======
            } else if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameReadyRing[ringIndex] = 0;
            } else {
                i = await new Promise<number>(workerBlockedExecutors[workerIndex]);
            }
>>>>>>> REPLACE
```

**Why**: Setting the array item to `null` is an extra memory write operation on the hot path. The memory reference to the previous frame buffer will be cleared exactly the same when the new frame buffer overwrites that index a few milliseconds later.
**Risk**: Functionally identical. No risk.

## Variations
None.

## Correctness Check
Run the DOM render benchmark script (`npx tsx packages/renderer/scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Results Summary
- **Best render time**: 2.705s (vs baseline ~2.755s, but overall current best is 2.447s)
- **Improvement**: ~1.8% vs local baseline, but regressed vs overall best.
- **Kept experiments**: []
- **Discarded experiments**: [PERF-665]
