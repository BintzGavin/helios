---
id: PERF-1190
slug: constant-pipeline-depth-and-bounds-check
status: unclaimed
claimed_by: ""
created: 2024-11-08
completed: ""
result: ""
---

# PERF-1190: Constant pipeline depth and bounds check math in CaptureLoop.ts

## Focus Area
The single-worker progress chunk boundaries, multi-worker worker-dispatch state assignments, and the dynamic calculation of `maxPipelineDepth` in `CaptureLoop.ts`. These execute frequently during the capture loop and dictate the bounds of frame rendering chunks.

## Background Research
In the single-worker capture loops (around lines 199 and 293), the chunk boundary is evaluated using an inline ternary that calculates `i + progressInterval` twice:
```typescript
const chunkEnd = i + progressInterval < loopEnd ? i + progressInterval : loopEnd;
```
V8 handles `Math.min` intrinsically and avoids re-evaluating the expressions. Swapping this specific inline ternary loop bound to `Math.min(i + progressInterval, loopEnd)` will reduce AST size and branch evaluation overhead.

Additionally, within the multi-worker worker-dispatch blocks (`if (n === totalFrames)` inside `checkState` and the chunk writer loop), the variable `h` is decremented in a `while (h !== 0)` loop, guaranteeing it is exactly `0` when the loop exits. Immediately afterward, there is a dead assignment `h = 0;`. Eliminating this dead store shrinks the AST for the worker-dispatch block with zero risk.

Finally, `maxPipelineDepth` is dynamically evaluated at the start of the multi-worker path:
```typescript
      let maxPipelineDepth = 64;
      maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
```
Since the initial assignment is `64` and `Math.pow(2, Math.ceil(Math.log2(64)))` identically resolves to `64`, this is a dynamic calculation of a static value. By defining `const maxPipelineDepth = 64;`, V8 can inline it directly into JIT compiled loops and closures (such as `nextFrameToWrite + maxPipelineDepth`). Removing the `let` binding eliminates potential deoptimizations related to mutable variables in fast-path loop bounds.

## Baseline
- **Bottleneck analysis**: The renderer spends significant time doing JIT evaluation of loop boundaries in the fast paths. Redundant expression evaluations inside loop constraints create unneeded CPU overhead. Dynamic variables block compiler optimization of loop constants.

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
In the `checkState` function, locate the `if (n === totalFrames)` block that stops waiting workers (around line 426):
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

In the main multi-worker chunk writer loop, locate the `if (n === totalFrames)` block (around line 534):
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

**Why**: The `while (h !== 0)` loop decrements `h` until it is `0`. The assignment `h = 0;` after the loop is dead code. Removing it reduces AST nodes inside the hot worker dispatch block.
**Risk**: Zero risk. It is a dead store elimination.

### Step 3: Replace dynamic maxPipelineDepth with constant
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the dynamic recalculation of `maxPipelineDepth` (around line 361) and declare it as a `const`:
```typescript
<<<<<<< SEARCH
      let maxPipelineDepth = 64;
      maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
=======
      const maxPipelineDepth = 64;
>>>>>>> REPLACE
```
**Why**: Eliminating the dynamic calculation shrinks the AST and converts a mutable `let` binding to a `const`. This enables V8 to inline `maxPipelineDepth` as a literal in downstream fast paths, optimizing loop bound checks.
**Risk**: Zero risk. Mathematically `Math.pow(2, Math.ceil(Math.log2(64))) === 64`.

## Variations
None.

## Correctness Check
Run the DOM rendering benchmark and check that progress logging occurs identically. The video should still render the full frames with correct timing.

## Prior Art
- PERF-1178, PERF-1177, PERF-1180: Proven success of swapping custom inline bound calculations with `Math.min` in `CaptureLoop.ts` to reduce AST overhead and leverage V8 intrinsics.
