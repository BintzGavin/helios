---
id: PERF-1068
slug: unroll-worker-dispatch-loops
status: unclaimed
claimed_by: ""
created: 2024-10-13
completed: ""
result: ""
---

# PERF-1068: Unroll Worker Dispatch Loops

## Focus Area
`CaptureLoop.ts` - Multi-worker ACTOR dispatch and wait loop chunk dispatch limits.

## Background Research
The multi-worker loop assigns tasks to waiting workers inside a loop that iterates up to `dispatches` times. Currently, it uses a standard `for (let d = 0; d < dispatches; d++)` loop. V8 microbenchmarks demonstrate that a backwards unrolled `while` loop that counts down to strict equality zero (`while (d !== 0)`) removes the per-iteration relational boundary check (`d < dispatches`). This optimizes the loop evaluation and speeds up tight inner array mutations. It yields a ~3-6% improvement on microbenchmarks for hot array pointer decrements.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition
- **Render Settings**: 1080p, 60fps, 5s (300 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~0.196s
- **Bottleneck analysis**: Microbenchmarks show that loop bounds evaluation is one of the hot spots for V8 TurboFan code generation. Removing relational bounds checks reduces state machine logic during execution.

## Implementation Spec

### Step 1: Update Worker Initialization Dispatch Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` multi-worker initialization block (around line 451), replace the `for (let d = 0; d < dispatches; d++)` loop with a backwards `while` loop.

From:
```typescript
                    for (let d = 0; d < dispatches; d++) {
                      h--;
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                      n++;
                    }
```

To:
```typescript
                    let d = dispatches;
                    while (d !== 0) {
                      d--;
                      h--;
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                      n++;
                    }
```
**Why**: Avoids `d < dispatches` relational bound check on every frame dispatch assignment.
**Risk**: Minimal. `dispatches` is known to be `> 0` due to the outer `if (dispatches > 0)` check.

### Step 2: Update Writer Chunk Wait Loop (DOM Strategy)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter = true` branch writer loops (around line 578), replace the similar `for` loop with the backwards `while` loop implementation.

From:
```typescript
                  for (let d = 0; d < dispatches; d++) {
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
```

To:
```typescript
                  let d = dispatches;
                  while (d !== 0) {
                    d--;
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
```
**Why**: Ensures hot loop paths also benefit from the strict equality bounded loop check.
**Risk**: Minimal, variable hoisting and decrements are safe.

### Step 3: Update Writer Chunk Wait Loop (Canvas Strategy)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter = false` branch writer loops (around line 649), replace the similar `for` loop with the backwards `while` loop implementation.

From:
```typescript
                  for (let d = 0; d < dispatches; d++) {
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
```

To:
```typescript
                  let d = dispatches;
                  while (d !== 0) {
                    d--;
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
```
**Why**: Same optimization for the Canvas branch.
**Risk**: Minimal.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure Canvas multi-worker rendering is unimpacted.

## Correctness Check
Run the DOM smoke tests to ensure frame ordering and timings are still correct:
`npm run test -w packages/renderer`

## Prior Art
- PERF-1063 successfully unrolled the worker cleanup loops from `while (head > 0)` and `for` loops into `while (head !== 0)` backwards loops, yielding a solid performance bump.
- PERF-1062, PERF-1051, PERF-1052 all focused on strict equality boundary checks for arrays and bounded numbers, which proved successful.
