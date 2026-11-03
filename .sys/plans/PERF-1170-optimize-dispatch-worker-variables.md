---
id: PERF-1170
slug: optimize-dispatch-worker-variables
status: complete
claimed_by: ""
created: 2024-11-03
completed: ""
result: ""
---

# PERF-1170: Optimize worker dispatch closure variable assignments in CaptureLoop.ts

## Focus Area
The multi-worker loop worker assignment blocks inside `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the identical `if (freeWorkersHead !== 0)` dispatch logic in `checkState` and inside the multi-worker `while` loop (which were inlined by a prior experiment).

## Background Research
Currently, the worker dispatch logic executes the following:
```typescript
if (freeWorkersHead !== 0) {
  const pipelineLimit = nextFrameToWrite + maxPipelineDepth;
  let dispatches = (pipelineLimit < totalFrames ? pipelineLimit : totalFrames) - nextFrameToSubmit;
  if (dispatches > 0) {
    let h = freeWorkersHead;
    let n = nextFrameToSubmit;
    const targetH = h - (dispatches < h ? dispatches : h);
    do {
      h--;
      workerThenables[freeWorkers[h]].resolve(n);
      n++;
    } while (h !== targetH);
    freeWorkersHead = targetH;
    nextFrameToSubmit = n;
  }

  let n = nextFrameToSubmit;
  let h = freeWorkersHead;
  // If we still have waiting workers but are at totalFrames, tell them to stop
  if (n === totalFrames) {
    while (h !== 0) {
      h--;
      workerThenables[freeWorkers[h]].resolve(-1);
    }
    h = 0;
  }
  freeWorkersHead = h;
  nextFrameToSubmit = n;
}
```

Notice that `freeWorkersHead` and `nextFrameToSubmit` are read from their closure scope into `h` and `n` in both the `dispatches > 0` block and the `n === totalFrames` block, and they are written back twice.
By hoisting the reads of `freeWorkersHead` and `nextFrameToSubmit` to the very beginning of the `if (freeWorkersHead !== 0)` block, doing the math on the local variables `h` and `n`, and only writing back to the outer variables once at the end, we can eliminate redundant variable lookups and assignments in V8, significantly shrinking the AST and avoiding closure write invalidations during the inner loop execution. Microbenchmarks show this reduces the function execution time slightly by keeping variables purely local to the block until the very end.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The worker assignment blocks are called frequently to dispatch frames to waiting workers. Writing and reading to/from the outer closure variables (`nextFrameToSubmit`, `freeWorkersHead`) causes unnecessary load/store operations in V8 TurboFan.

## Implementation Spec

### Step 1: Optimize variable state in `checkState` worker dispatch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `checkState` function (around line 423), update the `if (freeWorkersHead !== 0)` block:

```typescript
if (freeWorkersHead !== 0) {
  let h = freeWorkersHead;
  let n = nextFrameToSubmit;

  const pipelineLimit = nextFrameToWrite + maxPipelineDepth;
  let dispatches = (pipelineLimit < totalFrames ? pipelineLimit : totalFrames) - n;

  if (dispatches > 0) {
    const targetH = h - (dispatches < h ? dispatches : h);
    do {
      h--;
      workerThenables[freeWorkers[h]].resolve(n);
      n++;
    } while (h !== targetH);
  }

  // If we still have waiting workers but are at totalFrames, tell them to stop
  if (n === totalFrames) {
    while (h !== 0) {
      h--;
      workerThenables[freeWorkers[h]].resolve(-1);
    }
    h = 0;
  }

  freeWorkersHead = h;
  nextFrameToSubmit = n;
}
```
**Why**: Avoids redundant reads and writes to `freeWorkersHead` and `nextFrameToSubmit` within the same execution path.
**Risk**: Standard algorithmic change. Risk of breaking the loop invariant is low since the logic remains identical.

### Step 2: Optimize variable state in the main writer loop worker dispatch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `try` block's writer loop (around line 536), apply the exact same variable hoisting change as above to the `if (freeWorkersHead !== 0)` block.

**Why**: This is the hot path where the most performance is gained by reducing closure writes.
**Risk**: Same as step 1.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure the multi-worker logic works well.

## Correctness Check
Run `npm run test --workspace=packages/renderer` to ensure no functionality is broken by the refactor.

## Prior Art
- PERF-929: Hoisted loop-carried induction variables (`freeWorkersHead` and `nextFrameToSubmit`) in multi-worker dispatch loops. This takes the same concept to the newly inlined blocks.
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	8.685	150	17.27	63.0	keep	hoist dispatch worker variables
2	8.687	150	17.27	63.8	keep	hoist dispatch worker variables
3	8.691	150	17.26	63.8	keep	hoist dispatch worker variables
