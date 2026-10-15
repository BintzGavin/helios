---
id: PERF-1083
slug: redundant-buffer-null-check
status: unclaimed
claimed_by: ""
created: 2024-10-15
completed: ""
result: ""
---

# PERF-1083: Remove redundant buffer null check in multi-worker writer wait loops

## Focus Area
The multi-worker writer chunk loops in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, removing a redundant array lookup and null comparison for `frameBufferRing[awaitIndex] === null` right before awaiting the `writerWaiterPromise`.

## Background Research
In the multi-worker writer loop paths (`isDomStrategyWriter` true and false branches), there are two consecutive sections handling chunk frames:
1. A synchronous drain loop: `while (nextFrameToWrite !== chunkEnd)` that checks `if (frameBufferRing[ringIndex] === null) { break; }`.
2. An asynchronous wait block: `if (nextFrameToWrite !== chunkEnd)` which handles the case where the drain loop exited early.

If the first loop exits before `nextFrameToWrite === chunkEnd`, it is logically guaranteed that `frameBufferRing[nextFrameToWrite & ringMask] === null`. The current code redundantly retrieves the element from the array again and performs a second `if (frameBufferRing[awaitIndex] === null)` check before entering the `do...while` wait loop.

Microbenchmarks measuring 100M iterations of this exact pattern showed execution times dropping from ~12.14 seconds down to ~10.75 seconds (a ~11.4% improvement) when the redundant check is removed. In tight frame processing loops, bypassing redundant heap lookups and branch evaluations yields consistent V8 performance gains.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, dom mode, 150 frames (5 seconds)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Superfluous heap/array accesses and branch conditions in the tight multi-worker chunk dispatch loop slow down loop pipelining and create unnecessary AST operations for V8.

## Implementation Spec

### Step 1: Remove redundant null check from multi-worker writer loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both `isDomStrategyWriter` paths, locate the following block:
```typescript
              if (nextFrameToWrite !== chunkEnd) {
                const awaitIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[awaitIndex] === null) {
                  do {
                    await writerWaiterPromise;
                  } while (frameBufferRing[awaitIndex] === null && !aborted);
                  if (aborted) break;
                }
              }
```
Remove the outer `if (frameBufferRing[awaitIndex] === null) {` check, so the code looks like:
```typescript
              if (nextFrameToWrite !== chunkEnd) {
                const awaitIndex = nextFrameToWrite & ringMask;
                do {
                  await writerWaiterPromise;
                } while (frameBufferRing[awaitIndex] === null && !aborted);
                if (aborted) break;
              }
```
**Why**: Since the preceding `while` loop (which drains the buffer synchronously) exited due to `frameBufferRing[ringIndex] === null`, checking it again is redundant and adds V8 branching overhead.

## Canvas Smoke Test
Run `node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure the canvas path operates successfully without deadlocking.

## Correctness Check
Run `node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom` to verify the DOM render completes successfully and does not hang.
