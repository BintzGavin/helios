---
id: PERF-1074
slug: consolidate-worker-cleanup-loops
status: unclaimed
claimed_by: ""
created: 2026-10-14
completed: ""
result: ""
---

# PERF-1074: Consolidate multi-worker cleanup loops into hoisted blocks

## Focus Area
The multi-worker loop coordination paths in `CaptureLoop.ts`. Specifically, loops that clean up waiting workers when `nextFrameToSubmit === totalFrames`.

## Background Research
Currently in the multi-worker paths (around lines 464, 590, and 661), after evaluating worker dispatch limits using hoisted local variables (`h` and `n`), the code writes these back to closure variables and then conditionally evaluates a worker cleanup block:
```typescript
                  if (dispatches > 0) {
                    // ... dispatch loop ...
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
                }
                if (nextFrameToSubmit === totalFrames) {
                  let head = freeWorkersHead;
                  while (head !== 0) {
                    head--;
                    const w = freeWorkers[head];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
                }
```
Microbenchmarks demonstrate that checking `n === totalFrames` inside the block that already hoisted the variables avoids closure reads and redundant assignment blocks:
```typescript
                  if (dispatches > 0) {
                    // ... dispatch loop ...
                  }
                  if (n === totalFrames) {
                    while (h !== 0) {
                      h--;
                      const w = freeWorkers[h];
                      workerThenables[w].resolve(-1);
                    }
                    h = 0;
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
                }
```
Moving the cleanup evaluation inside the scope of `let h` and `let n` eliminates duplicate closure lookups of `nextFrameToSubmit` and `freeWorkersHead`, and reduces AST size.

## Benchmark Configuration
- **Composition URL**: Any standard benchmark composition.
- **Render Settings**: Standard multi-worker settings.
- **Mode**: `dom` and `canvas`
- **Metric**: Execution speed in microbenchmarks / Wall-clock render time in seconds.
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant closure reads (`nextFrameToSubmit === totalFrames`) and variable assignments (`let head = freeWorkersHead`) right after they were locally evaluated.

## Implementation Spec

### Step 1: Consolidate worker cleanup in `checkState`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `checkState` loop (around line 457), modify the dispatch assignment block:
```typescript
<<<<<<< SEARCH
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
                  if (nextFrameToSubmit === totalFrames) {
                    let head = freeWorkersHead;
                    while (head !== 0) {
                      head--;
                      const w = freeWorkers[head];
                      workerThenables[w].resolve(-1);
                    }
                    freeWorkersHead = 0;
                  }
=======
                  let h = freeWorkersHead;
                  let n = nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = dispatches < h ? dispatches : h;
                    for (let d = 0; d < dispatches; d++) {
                      h--;
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                      n++;
                    }
                  }
                  if (n === totalFrames) {
                    while (h !== 0) {
                      h--;
                      const w = freeWorkers[h];
                      workerThenables[w].resolve(-1);
                    }
                    h = 0;
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
>>>>>>> REPLACE
```

### Step 2: Consolidate worker cleanup in DOM multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `isDomStrategyWriter` around line 576, apply the same consolidation logic:
```typescript
<<<<<<< SEARCH
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
                  if (nextFrameToSubmit === totalFrames) {
                    let head = freeWorkersHead;
                    while (head !== 0) {
                      head--;
                      const w = freeWorkers[head];
                      workerThenables[w].resolve(-1);
                    }
                    freeWorkersHead = 0;
                  }
=======
                  let h = freeWorkersHead;
                  let n = nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = dispatches < h ? dispatches : h;
                    for (let d = 0; d < dispatches; d++) {
                      h--;
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                      n++;
                    }
                  }
                  if (n === totalFrames) {
                    while (h !== 0) {
                      h--;
                      const w = freeWorkers[h];
                      workerThenables[w].resolve(-1);
                    }
                    h = 0;
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
>>>>>>> REPLACE
```

### Step 3: Consolidate worker cleanup in Canvas multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `!isDomStrategyWriter` around line 647, apply the same consolidation logic:
```typescript
<<<<<<< SEARCH
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
                  if (nextFrameToSubmit === totalFrames) {
                    let head = freeWorkersHead;
                    while (head !== 0) {
                      head--;
                      const w = freeWorkers[head];
                      workerThenables[w].resolve(-1);
                    }
                    freeWorkersHead = 0;
                  }
=======
                  let h = freeWorkersHead;
                  let n = nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = dispatches < h ? dispatches : h;
                    for (let d = 0; d < dispatches; d++) {
                      h--;
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                      n++;
                    }
                  }
                  if (n === totalFrames) {
                    while (h !== 0) {
                      h--;
                      const w = freeWorkers[h];
                      workerThenables[w].resolve(-1);
                    }
                    h = 0;
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
>>>>>>> REPLACE
```

**Why**: Using the local hoisted state for the loop and the limit evaluation bypasses redundant closure variable assignments and lookup operations, creating a smaller, tighter loop block inside the hot path.
**Risk**: None, functionally equivalent.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to verify behaviour is correct.

## Correctness Check
Run renderer in a real project to verify standard operation.
