---
id: PERF-1106
slug: inline-dispatches-evaluation
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1106: Inline multi-worker `dispatches` logic check in CaptureLoop.ts

## Focus Area
The multi-worker loop in `packages/renderer/src/core/CaptureLoop.ts` handles task dispatching by checking an intermediate `dispatches` variable. By unrolling and inlining this condition, we can slightly improve V8 AST parsing.

## Background Research
Currently, the multi-worker path in `CaptureLoop.ts` around lines 433 and 522 includes this logic:
```typescript
                if (dispatches > 0) {
                  for (let d = 0, bound = dispatches < h ? dispatches : h; d < bound; d++) {
                    h--;
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[freeWorkers[h]].resolve(n);
                    n++;
                  }
                }
```
This is computationally redundant; the standard `for` loop `d < bound` condition already protects against `dispatches <= 0` (since `bound` would be `<= 0`). Removing the outer `if (dispatches > 0)` check reduces parser AST nodes, eliminating an unnecessary branch inside a hot loop and improving JIT execution density without affecting correctness.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant V8 branch parsing instructions.

## Implementation Spec

### Step 1: Inline dispatch evaluation
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `CaptureLoop.ts`, remove the `if (dispatches > 0)` block wrapping the `for` loop in both the `checkState` and the main loop.

Replace:
```typescript
                if (dispatches > 0) {
                  for (let d = 0, bound = dispatches < h ? dispatches : h; d < bound; d++) {
                    h--;
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[freeWorkers[h]].resolve(n);
                    n++;
                  }
                }
```
With:
```typescript
                for (let d = 0, bound = dispatches < h ? dispatches : h; d < bound; d++) {
                  h--;
                  frameBufferRing[n & ringMask] = null;
                  workerThenables[freeWorkers[h]].resolve(n);
                  n++;
                }
```

**Why**: Removes redundant branch logic.

### Step 2: Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken.

### Step 3: Complete Pre Commit
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
