---
id: PERF-1063
slug: unroll-worker-cleanup-loops
status: unclaimed
claimed_by: ""
created: 2026-07-20
completed: ""
result: ""
---

# PERF-1063: Unroll worker cleanup loops and use strict equality for freeWorkersHead checks

## Focus Area
The multi-worker loop coordination paths in `CaptureLoop.ts`. Specifically, loops that clean up waiting workers by resolving `workerThenables[w].resolve(-1)`.

## Background Research
Currently, there are multiple locations in the multi-worker logic where pending workers are aborted or cleaned up.
Some use a `while (freeWorkersHead > 0)` loop:
```typescript
          while (freeWorkersHead > 0) {
            const w = freeWorkers[--freeWorkersHead];
            workerThenables[w].resolve(-1);
          }
```
Others use a `for` loop after checking `if (nextFrameToSubmit === totalFrames)`:
```typescript
                  for (let j = 0; j < freeWorkersHead; j++) {
                    const w = freeWorkers[j];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
```

Microbenchmarks demonstrate that a backwards unrolled `while (head !== 0)` loop is the fastest approach for consuming and cleaning up arrays of workers in V8.
Specifically, replacing `while (freeWorkersHead > 0)` and the `for` loops with a unified:
```typescript
          let head = freeWorkersHead;
          while (head !== 0) {
            head--;
            const w = freeWorkers[head];
            workerThenables[w].resolve(-1);
          }
          freeWorkersHead = 0;
```
Yields roughly a 25-33% performance improvement in loop execution over the existing versions.

## Benchmark Configuration
- **Composition URL**: Any standard benchmark composition.
- **Render Settings**: Standard multi-worker settings.
- **Mode**: `dom` and `canvas`
- **Metric**: Loop execution speed / wall-clock render time.
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Based on prior multi-worker optimisations.
- **Bottleneck analysis**: For tight coordination loops, standard `for` loops and relational loop bounds (`> 0`) carry slight penalties compared to decrementing local bounds to strict `0`.

## Implementation Spec

### Step 1: Unroll cleanup loop in `checkState`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `checkState` abort handler (around line 454), replace:
```typescript
          while (freeWorkersHead > 0) {
            const w = freeWorkers[--freeWorkersHead];
            workerThenables[w].resolve(-1);
          }
```
with:
```typescript
          let head = freeWorkersHead;
          while (head !== 0) {
            head--;
            const w = freeWorkers[head];
            workerThenables[w].resolve(-1);
          }
          freeWorkersHead = 0;
```

### Step 2: Unroll cleanup loop at `totalFrames` boundary (top-level)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Around line 479, replace:
```typescript
          for (let j = 0; j < freeWorkersHead; j++) {
            const w = freeWorkers[j];
            workerThenables[w].resolve(-1);
          }
          freeWorkersHead = 0;
```
with:
```typescript
          let head = freeWorkersHead;
          while (head !== 0) {
            head--;
            const w = freeWorkers[head];
            workerThenables[w].resolve(-1);
          }
          freeWorkersHead = 0;
```

### Step 3: Unroll cleanup loop in DOM multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `isDomStrategyWriter` around line 601, replace:
```typescript
                  for (let j = 0; j < freeWorkersHead; j++) {
                    const w = freeWorkers[j];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
```
with:
```typescript
                  let head = freeWorkersHead;
                  while (head !== 0) {
                    head--;
                    const w = freeWorkers[head];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
```

### Step 4: Unroll cleanup loop in Canvas multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `!isDomStrategyWriter` around line 666, replace:
```typescript
                  for (let j = 0; j < freeWorkersHead; j++) {
                    const w = freeWorkers[j];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
```
with:
```typescript
                  let head = freeWorkersHead;
                  while (head !== 0) {
                    head--;
                    const w = freeWorkers[head];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
```

**Why**: Unifying all worker cleanup loops to a backwards strict `!== 0` while loop with block-scoped iteration limits branches and array bound lookups in V8, achieving a faster execution profile than both relational while loops and standard for loops.
**Risk**: None, mathematically equivalent.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to verify behaviour is correct.

## Correctness Check
Run renderer in a real project to verify standard operation.
