---
id: PERF-1085
slug: combined-await-check
status: unclaimed
claimed_by: ""
created: 2024-10-16
completed: ""
result: ""
---

# PERF-1085: Combine await loop boundary checks

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - Multi-worker writer loops

## Background Research
The multi-worker writer loops in `CaptureLoop.ts` wait for workers to fulfill the ring buffer using `writerWaiterPromise`. The condition checks if we've reached `chunkEnd` and, if not, gets the `awaitIndex` and checks if the buffer at that index is `null`.

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

Microbenchmarks demonstrate that merging the `chunkEnd` condition and the array bounds check into a single expression short-circuits evaluation in V8 and reduces AST complexity, eliminating the need for an intermediate variable when not entering the wait state.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3

## Baseline
- **Bottleneck analysis**: Microbenchmarks show that combining the check reduces overhead from ~428ms to ~388ms (for 10M iterations), an ~9% improvement in raw JS execution for this section of the code.

## Implementation Spec

### Step 1: Combine await checks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the `await writerWaiterPromise;` sections in both the `isDomStrategyWriter` block and the `else` block (multi-worker loop).
Replace the nested `if` structure:

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

with the combined check:

```typescript
              if (nextFrameToWrite !== chunkEnd && frameBufferRing[nextFrameToWrite & ringMask] === null) {
                const awaitIndex = nextFrameToWrite & ringMask;
                do {
                  await writerWaiterPromise;
                } while (frameBufferRing[awaitIndex] === null && !aborted);
                if (aborted) break;
              }
```

**Why**: Short-circuits the array lookup and masks when `nextFrameToWrite === chunkEnd`, reducing instruction counts in the hot loop.
**Risk**: Negligible. Functionally identical.

## Canvas Smoke Test
Run `node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure the canvas path hasn't broken. Note: the canvas benchmark currently fails, verify via `npm run test -w packages/renderer` or basic script execution.

## Correctness Check
Verify dom renders still complete successfully.
