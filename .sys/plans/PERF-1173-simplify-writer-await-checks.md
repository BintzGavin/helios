---
id: PERF-1173
slug: simplify-writer-await-checks
status: claimed
claimed_by: Jules
claimed_by: ""
created: 2024-11-04
completed: ""
result: ""
---

# PERF-1173: Simplify writer await block checks in CaptureLoop.ts

## Focus Area
The multi-worker loop's writer loop inside `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the bounds checking when determining if the writer must await the next frame buffer.

## Background Research
Currently, inside the multi-worker writer chunk loop:
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
Wait, the `while (nextFrameToWrite !== chunkEnd)` loop right before this block breaks exactly when `frameBufferRing[ringIndex] === null`:
```typescript
            while (nextFrameToWrite !== chunkEnd) {
              const ringIndex = nextFrameToWrite & ringMask;
              if (frameBufferRing[ringIndex] === null) {
                break;
              }
              // ... write buffer
            }
```
Because of this `break`, if `nextFrameToWrite !== chunkEnd`, then we ALREADY KNOW `frameBufferRing[nextFrameToWrite & ringMask] === null`.
Therefore, the secondary check:
```typescript
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              if (frameBufferRing[awaitIndex] === null) {
```
The `if (frameBufferRing[awaitIndex] === null)` is completely redundant! It is guaranteed to be true if `nextFrameToWrite !== chunkEnd` because that's the only condition that causes the preceding `while` loop to break early.

By removing this redundant array lookup and branch check, we save V8 AST parsing size and an unnecessary bounds-checked array read in the hot multi-worker synchronization path.

## Baseline
- **Bottleneck analysis**: The redundant array lookup `frameBufferRing[awaitIndex] === null` happens every single time a chunk pauses to wait for a worker, which occurs continuously throughout a standard multi-worker render.

## Implementation Spec

### Step 1: Remove redundant buffer check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `try` block's writer loop (around line 580):
Change:
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
To:
```typescript
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              do {
                await writerWaiterPromise;
              } while (frameBufferRing[awaitIndex] === null && !aborted);
              if (aborted) break;
            }
```
**Why**: `frameBufferRing[awaitIndex] === null` is guaranteed to be true here, so wrapping the `do/while` loop in an `if` check is redundant and wastes execution cycles.
**Risk**: None. Mathematically equivalent.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure the multi-worker logic works well.

## Correctness Check
Run `npm run test --workspace=packages/renderer` to ensure no functionality is broken by the refactor.
