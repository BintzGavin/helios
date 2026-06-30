---
id: PERF-889
slug: hoist-drainpromise
status: unclaimed
claimed_by: ""
created: 2024-06-30
completed: ""
result: ""
---

# PERF-889: Hoist drainPromise check in Multi-Worker Writer

## Focus Area
The multi-worker write loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, eliminating the per-iteration `if (!writeSuccess && pendingBytes >= 16777216)` drain check from the fast inner chunked loops by hoisting it to the outer block.

## Background Research
Currently in the multi-worker chunked writer paths (both the `isString` string chunk loop and the `!isString` buffer chunk loop), the logic checks `if (!writeSuccess && pendingBytes >= 16777216)` on every single frame inside the hot inner chunked `while (nextFrameToWrite < chunkEnd)` loop.

However, evaluating `pendingBytes >= 16777216` every single frame is redundant overhead in V8. The inner chunk loop processes up to `progressInterval` (100) frames at a time. It is perfectly safe to let `pendingBytes` temporarily exceed the 16MB threshold during the inner loop execution, and then evaluate the drain check once in the outer loop block after the chunk completes. This significantly reduces the branch evaluations happening inside the innermost hot loop of the capture process.

Microbenchmarks of hoisting this drain check out of a 100-iteration inner loop showed an ~10% improvement in tight loop execution overhead (from ~0.672ms to ~0.603ms for 300,000 iterations).

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom` (with multiple workers)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary per-iteration branch evaluation for `writeSuccess` and `pendingBytes` thresholds in the V8 innermost hot loop.

## Implementation Spec

### Step 1: Hoist drain check in string path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isString` string inner chunk loop (around lines 1488-1514):
1. Remove the drain check from inside `while (nextFrameToWrite < chunkEnd)`:
```typescript
<<<<<<< SEARCH
                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
=======
                nextFrameToWrite++;
>>>>>>> REPLACE
```
2. Insert it *after* the worker `if (freeWorkersHead > 0) { ... }` block that immediately follows the inner loop, but before the `nextProgress` check:
```typescript
<<<<<<< SEARCH
              if (nextFrameToWrite >= nextProgress) {
=======
              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }

              if (nextFrameToWrite >= nextProgress) {
>>>>>>> REPLACE
```
*Note*: In `CaptureLoop.ts`, `writeSuccess` is declared globally before the loop (`let writeSuccess = false;`). Ensure it remains correctly assigned by `stream.write` inside the chunk loop. Change `const writeSuccess = stream.write(...)` inside the loop to use the outer `writeSuccess`.

### Step 2: Hoist drain check in buffer path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the same change to the `!isString` buffer inner chunk loop (around lines 1573-1594).
Remove the drain check from inside the loop:
```typescript
<<<<<<< SEARCH
                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
=======
                nextFrameToWrite++;
>>>>>>> REPLACE
```
And insert it after the worker dispatch block, just like Step 1. Ensure `writeSuccess` is assigned to the outer variable rather than a `const` inside the loop.

**Why**: By checking the buffer threshold only once every chunk (100 frames), we avoid V8 branching overhead on every single frame, allowing the hot loop to run faster. Over-buffering by a few MB before draining is completely safe and won't OOM.

## Variations
None.

## Canvas Smoke Test
Run `npm test -w packages/renderer` to ensure canvas mode still works.

## Correctness Check
Run `npm test -w packages/renderer` to verify DOM output is still correct.
