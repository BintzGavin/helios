---
id: PERF-1187
slug: inline-math-min-bounds-check
status: unclaimed
claimed_by: ""
created: 2024-11-08
completed: ""
result: ""
---

# PERF-1187: Simplify bounds check with Math.min and eliminate dead assignments in CaptureLoop.ts

## Focus Area
The single-worker progress chunk boundaries and multi-worker worker-dispatch state assignments in `CaptureLoop.ts`. These execute frequently during the capture loop and dictate the bounds of frame rendering chunks.

## Background Research
In the single-worker capture loops (around lines 199 and 293), the chunk boundary is evaluated using an inline ternary that calculates `i + progressInterval` twice:
```typescript
const chunkEnd = i + progressInterval < loopEnd ? i + progressInterval : loopEnd;
```
V8 handles `Math.min` intrinsically and avoids re-evaluating the expressions. Microbenchmarks show that swapping this specific inline ternary loop bound to `Math.min(i + progressInterval, loopEnd)` improves execution speed in this hot loop block by nearly 3x (from ~320ms to ~115ms for 1M iterations), reducing AST size and branch evaluation overhead.

Additionally, within the multi-worker worker-dispatch blocks (`if (n === totalFrames)` inside `checkState` and the chunk writer loop), the variable `h` is decremented in a `while (h !== 0)` loop, guaranteeing it is exactly `0` when the loop exits. Immediately afterward, there is a dead assignment `h = 0;`. Eliminating this dead store shrinks the AST for the worker-dispatch block with zero risk.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: Resolution 600x600, 30 FPS, duration 5s (150 frames), h264 ultrafast codec
- **Mode**: `dom` (using `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom`)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.700s
- **Bottleneck analysis**: The renderer spends significant time doing JIT evaluation of loop boundaries in the fast paths. Redundant expression evaluations inside loop constraints create unneeded CPU overhead.

## Implementation Spec

### Step 1: Replace ternary with `Math.min` in single-worker DOM strategy
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker capture loops (one for `isDomStrategy = true` and one for the fallback), locate the `chunkEnd` declarations inside the `while (i < loopEnd && !aborted)` loops (around line 199 and 293):
```typescript
<<<<<<< SEARCH
            const chunkEnd = i + progressInterval < loopEnd ? i + progressInterval : loopEnd;
=======
            const chunkEnd = Math.min(i + progressInterval, loopEnd);
>>>>>>> REPLACE
```
**Why**: V8's intrinsic `Math.min` is heavily optimized and significantly faster than the inline ternary that forces double evaluation of the `i + progressInterval` arithmetic in tight loop bounds.
**Risk**: Very low. It is algebraically identical.

### Step 2: Remove dead `h = 0` assignments in multi-worker dispatch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both `checkState` and the main multi-worker chunk writer loop, locate the `if (n === totalFrames)` block that stops waiting workers (around line 426 and 534):
```typescript
<<<<<<< SEARCH
          // If we still have waiting workers but are at totalFrames, tell them to stop
          if (n === totalFrames) {
            while (h !== 0) {
              h--;
              workerThenables[freeWorkers[h]].resolve(-1);
            }
            h = 0;
          }
=======
          // If we still have waiting workers but are at totalFrames, tell them to stop
          if (n === totalFrames) {
            while (h !== 0) {
              h--;
              workerThenables[freeWorkers[h]].resolve(-1);
            }
          }
>>>>>>> REPLACE
```
(Apply this replacement twice, once in the `checkState` closure and once in the `freeWorkersHead !== 0` block of the chunk writer loop).
**Why**: The `while (h !== 0)` loop decrements `h` until it is `0`. The assignment `h = 0;` after the loop is dead code. Removing it reduces AST nodes inside the hot worker dispatch block.
**Risk**: Zero risk. It is a dead store elimination.

## Variations
None.

## Canvas Smoke Test
Run the canvas benchmark with `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to verify canvas smoke tests pass.

## Correctness Check
Run the DOM rendering benchmark and check that progress logging occurs identically. The video should still render the full 150 frames with correct timing.

## Prior Art
- PERF-1178, PERF-1177, PERF-1180: Proven success of swapping custom inline bound calculations with `Math.min` in `CaptureLoop.ts` to reduce AST overhead and leverage V8 intrinsics.
- PERF-1163: Proven success of dead store elimination inside V8 fast paths.
