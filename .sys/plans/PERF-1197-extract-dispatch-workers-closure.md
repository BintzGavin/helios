---
id: PERF-1197
slug: extract-dispatch-workers-closure
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-1197: Extract dispatchWorkers closure to deduplicate worker assignment logic

## Focus Area
The multi-worker assignment path in `CaptureLoop.ts`. Specifically targeting V8 AST parser overhead and async state machine size by deduplicating a 22-line block of logic that assigns tasks to waiting workers.

## Background Research
In V8, large `async` functions (like `CaptureLoop.run()`) suffer from inflated AST parsing overhead and complex async state machine generation. In prior experiments (like PERF-1164 where `runWorker` was extracted), reducing the size of the outer `async` function's body by moving duplicated logic into smaller, inlineable closures yielded measurable performance gains. TurboFan can easily inline small, monomorphic closures while keeping the outer async function's state machine much smaller.

Currently, `CaptureLoop.ts` contains an identical ~22-line block of code for assigning tasks to free workers. It appears once inside `checkState()` and again inside the main multi-worker writer chunk loop. Extracting this block into a single shared closure (`dispatchWorkers`) will significantly shrink the byte-code footprint of the hot render loop.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/composition.html
- **Render Settings**: 600x600, 30fps, 5s dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.6s
- **Bottleneck analysis**: The `run()` async function in `CaptureLoop.ts` is massive. By deduplicating the 22-line worker assignment block, we can reduce its AST size and lower the JIT compilation burden.

## Implementation Spec

### Step 1: Extract `dispatchWorkers` closure
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Right before the `const checkState = () => { ... }` declaration in the multi-worker `else` block, create a new closure:
```typescript
      const dispatchWorkers = () => {
        if (freeWorkersHead !== 0) {
          let h = freeWorkersHead;
          let n = nextFrameToSubmit;

          let dispatches = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames) - n;

          if (dispatches > 0) {
            const targetH = dispatches < h ? h - dispatches : 0;
            do {
              workerThenables[freeWorkers[--h]].resolve(n++);
            } while (h !== targetH);
          }

          // If we still have waiting workers but are at totalFrames, tell them to stop
          if (n === totalFrames) {
            while (h !== 0) {
              workerThenables[freeWorkers[--h]].resolve(-1);
            }
          }

          freeWorkersHead = h;
          nextFrameToSubmit = n;
        }
      };
```
**Why**: Creates a reusable, monomorphic function for worker assignment that V8 can easily optimize and inline.

### Step 2: Replace duplicated logic in `checkState`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `checkState` function, replace the entire `if (freeWorkersHead !== 0) { ... }` block (which spans about 22 lines) with a single call to `dispatchWorkers();`.

### Step 3: Replace duplicated logic in main writer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the main multi-worker writer loop (`while (nextFrameToWrite !== totalFrames && !aborted) {`), right after `const startWrite = nextFrameToWrite;`, there is another identical `if (freeWorkersHead !== 0) { ... }` block. Replace this entire block with a single call to `dispatchWorkers();`.

**Why**: Deduplicates complex loop/branching logic, shrinking the byte-code size of the main `CaptureLoop.run()` async state machine and reducing AST parser overhead.

## Correctness Check
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom` to verify the rendering pipeline still processes all frames without deadlocks.
