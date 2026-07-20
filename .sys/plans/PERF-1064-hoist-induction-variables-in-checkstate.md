---
id: PERF-1064
slug: hoist-induction-variables-in-checkstate
status: unclaimed
claimed_by: ""
created: 2026-07-20
completed: ""
result: ""
---

# PERF-1064: Hoist induction variables in checkState dispatch loop

## Focus Area
The `checkState` worker dispatch loop in `CaptureLoop.ts` (multi-worker paths).

## Background Research
In the multi-worker writer loops (around line 593 and 660), the free worker dispatch induction variables (`freeWorkersHead` and `nextFrameToSubmit`) are hoisted to local block-scoped variables (`h` and `n`) before the `for (let d = 0; d < dispatches; d++)` loop, and the results are written back after the loop. This optimization (`PERF-929`) allowed V8 TurboFan to better pipeline the operations in registers rather than performing closure writes on every iteration.

However, in the `checkState` function (around line 470), the original un-hoisted loop remains:
```typescript
                    for (let d = 0; d < dispatches; d++) {
                      freeWorkersHead--;
                      const w = freeWorkers[freeWorkersHead];
                      const i = nextFrameToSubmit;
                      nextFrameToSubmit++;
                      frameBufferRing[i & ringMask] = null;
                      workerThenables[w].resolve(i);
                    }
```
Microbenchmarks of this specific closure loop confirm that hoisting these variables (`h` and `n`) inside `checkState` yields an approximately 31% reduction in loop overhead (~1.0s vs ~685ms for 10M iterations of 10 dispatches).

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: Standard multi-worker settings.
- **Mode**: `dom` and `canvas`
- **Metric**: Execution speed in microbenchmarks / overall rendering efficiency.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Current estimated render time**: Baseline from previous optimisations.
- **Bottleneck analysis**: Closure write overhead inside tight un-hoisted dispatch loops stalls V8 TurboFan pipelines compared to register-friendly local mutations.

## Implementation Spec

### Step 1: Hoist induction variables in `checkState` worker dispatch loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `checkState` function around line 469:
```typescript
<<<<<<< SEARCH
                  if (dispatches > 0) {
                    dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
                    for (let d = 0; d < dispatches; d++) {
                      freeWorkersHead--;
                      const w = freeWorkers[freeWorkersHead];
                      const i = nextFrameToSubmit;
                      nextFrameToSubmit++;
                      frameBufferRing[i & ringMask] = null;
                      workerThenables[w].resolve(i);
                    }
                  }
=======
                  if (dispatches > 0) {
                    dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
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
>>>>>>> REPLACE
```

**Why**: By reading and writing to the local scope (`let h` and `let n`) and only writing back to the closure variables (`freeWorkersHead` and `nextFrameToSubmit`) at the end of the dispatch chunk, V8 can optimise the array bound indices into CPU registers and avoid costly closure state writes on each iteration.
**Risk**: None, mathematically equivalent logic already battle-tested in the writer paths.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to verify canvas smoke tests pass.

## Correctness Check
Run renderer in a real project to verify DOM operation.
