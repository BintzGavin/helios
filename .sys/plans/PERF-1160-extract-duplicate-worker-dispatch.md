---
id: PERF-1160
slug: extract-duplicate-worker-dispatch
status: unclaimed
claimed_by: ""
created: 2024-11-01
completed: ""
result: ""
---

# PERF-1160: Extract duplicate worker dispatch logic in CaptureLoop.ts to reduce AST size

## Focus Area
The multi-worker worker dispatch logic inside `CaptureLoop.ts` `run()` method.

## Background Research
In the multi-worker path of `CaptureLoop.ts`, there is a chunk of code responsible for waking up waiting workers and assigning them frame numbers to render. This identical chunk of code (about 30 lines) is duplicated in two places:
1. Inside the `checkState()` closure (lines ~425-456).
2. Inside the multi-worker writer loop (lines ~543-572).

Because V8 compiles and parses the entire `run()` function body, having this complex logic duplicated increases the Abstract Syntax Tree (AST) size and reduces the density of the instruction cache.

By extracting this duplicated logic into a small, inline closure (e.g., `const dispatchWorkers = () => { ... }`) and calling it in both places, we can significantly reduce the AST payload for the hot multi-worker path. V8's TurboFan compiler is very good at inlining small closures where appropriate, so we get the benefits of smaller source code parsing without sacrificing runtime execution speed.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~13.2s
- **Bottleneck analysis**: Duplicated dispatch code inflates V8 AST parsing time and memory footprint during the multi-worker loop initialization and JIT phases.

## Implementation Spec

### Step 1: Extract `dispatchWorkers` closure
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the multi-worker `else` branch (around line 424, right before `checkState`), define a new closure:
```typescript
      const dispatchWorkers = () => {
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
      };
```

### Step 2: Replace duplicated code with `dispatchWorkers()` calls
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Inside `checkState`, replace the `if (freeWorkersHead !== 0) { ... }` block with `dispatchWorkers();`.
2. Inside the writer loop (around line 543), replace the `if (freeWorkersHead !== 0) { ... }` block with `dispatchWorkers();`.

*Note: Ensure that the writer loop does not rely on local variables that aren't updated. `nextFrameToSubmit`, `freeWorkersHead`, etc. are captured from the outer scope, so this will work seamlessly.*

**Why**: Shrinks the V8 AST payload for this function by deduplicating ~30 lines of code, reducing parsing overhead and instruction cache size, while allowing TurboFan to manage inlining.
**Risk**: If variables mutated inside the closure aren't properly reflected in the outer scope, it could cause an infinite loop. However, since `let nextFrameToSubmit` and `let freeWorkersHead` are defined in the parent `run()` scope, the closure will correctly capture and mutate them.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
Extracting identical branch blocks for AST reduction (PERF-1158, PERF-1159).
