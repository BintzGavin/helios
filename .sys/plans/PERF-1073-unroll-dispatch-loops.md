---
id: PERF-1073
slug: unroll-dispatch-loops
status: complete
claimed_by: "executor-session"
created: 2024-10-14
completed: "2024-10-14"
result: "discarded"
---

# PERF-1073: Unroll worker dispatch loops

## Focus Area
The multi-worker loop in `CaptureLoop.ts` evaluating limits when dispatching idle workers.

## Background Research
Currently in `CaptureLoop.ts`, worker dispatches evaluate pipeline bounds using an inline ternary operator and a standard `for` loop to assign tasks:
```typescript
for (let d = 0; d < dispatches; d++) {
  h--;
  const w = freeWorkers[h];
  frameBufferRing[n & ringMask] = null;
  workerThenables[w].resolve(n);
  n++;
}
```

We want to evaluate replacing this standard `for` loop with a backwards `do-while` loop counting down from `dispatches`, eliminating the intermediate variable `d` and explicit array reassignment in `CaptureLoop.ts`. Previous experiments with a standard `while` loop (PERF-1068) showed a regression, but a `do-while` loop might yield better pipeline behavior since we already know `dispatches > 0`.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Overhead of the `for` loop induction variable `d` and the comparison `d < dispatches` on each iteration.

## Implementation Spec

### Step 1: Replace for loops with do-while loops in `checkState`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `checkState` (around line 452), change the `for` loop to a `do-while` loop.
```typescript
                    let d = dispatches;
                    do {
                      h--;
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                      n++;
                      d--;
                    } while (d !== 0);
```

### Step 2: Replace for loops with do-while loops in writer chunk loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both `isDomStrategyWriter` and standard writer chunk loops (around lines 579 and 650), change the `for` loop to a `do-while` loop just like in Step 1.
```typescript
                  let d = dispatches;
                  do {
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                    d--;
                  } while (d !== 0);
```

## Variations
No variations.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure frame limits aren't violated.

## Correctness Check
Verify DOM and Canvas output are still correct and don't hang due to starvation.

## Results Summary
- **Best render time**: 4.493s baseline vs 4.512s do-while
- **Improvement**: Regressed / Inconclusive
- **Kept experiments**: None
- **Discarded experiments**: Replace standard for loops with do-while loops
