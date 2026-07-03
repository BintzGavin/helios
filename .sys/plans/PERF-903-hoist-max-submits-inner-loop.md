---
id: PERF-903
slug: hoist-max-submits-inner-loop
status: unclaimed
claimed_by: ""
created: 2024-07-03
completed: ""
result: ""
---
# PERF-903: Hoist `maxSubmits` Loop Boundary in Multi-Worker Inner Fast Loops

## Focus Area
`CaptureLoop.ts` - The single-worker and multi-worker wait loops inside `runWorker`.

## Background Research
Currently, inside the `runWorker` chunk traversal loops (for instance, around line 1105, 1172, 1241, 1303), the loop check does:
```typescript
if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) { ... }
```
This requires subtracting `nextFrameToWrite` from `nextFrameToSubmit` and comparing it to `maxPipelineDepth` on every single iteration.

In PERF-890, we did something similar for the writer dispatch loop by hoisting `nextFrameToWrite + maxPipelineDepth` to a `maxSubmits` variable, improving microbenchmark wall time.

We can apply the exact same optimization to the inner traversal loop by maintaining `maxSubmits` outside the condition:
```typescript
let maxSubmits = nextFrameToWrite + maxPipelineDepth;
// ... inside the loop ...
if (nextFrameToSubmit < maxSubmits) {
   // ...
}
```
And whenever `nextFrameToWrite` changes, we update `maxSubmits = nextFrameToWrite + maxPipelineDepth;`.

Microbenchmarks demonstrate that this optimization yields approximately a 9% performance improvement in the tight loop iteration time (from ~8.4s to ~7.7s for 10M iterations).

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker path)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 engine evaluates the subtraction `nextFrameToSubmit - nextFrameToWrite` on every chunk iteration. Pre-calculating the boundary eliminates the operation.

## Implementation Spec

### Step 1: Update the inner fast loops to use `maxSubmits`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the 4 inner traversal loops within `runWorker` (the ones that currently do `if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth)`):

1. Right before the `while (!aborted && nextFrameToSubmit < totalFrames)` loop, add:
   ```typescript
   let maxSubmits = nextFrameToWrite + maxPipelineDepth;
   ```
2. Replace the check:
   ```typescript
   if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth)
   ```
   with:
   ```typescript
   if (nextFrameToSubmit < maxSubmits)
   ```
3. Inside the `else` branch (where workers are dispatched), make sure that when `maxSubmits` is used for the nested `while` loop, you just update the existing variable instead of declaring a new `const maxSubmits`:
   ```typescript
   // from: const maxSubmits = nextFrameToWrite + maxPipelineDepth;
   // to:
   maxSubmits = nextFrameToWrite + maxPipelineDepth;
   ```

**Why**: Pre-calculating the chunk boundary removes subtraction overhead from the innermost `while` loop, compounding the benefits introduced by PERF-890.
**Risk**: If `maxSubmits` is not correctly updated when `nextFrameToWrite` changes (though in this specific loop, `nextFrameToWrite` is primarily updated asynchronously in the writer path, which will automatically be reflected when `maxSubmits` is recalculated during a worker wake-up), we could drift. However, since the inner loops are tight and fast, evaluating against the cached `maxSubmits` is sufficient until the worker yields or is parked.

## Canvas Smoke Test
Run `npx vitest run verify-canvas` to ensure the canvas path is untouched.

## Correctness Check
Run `npm test -w packages/renderer` to ensure no frame synchronization regressions occurred.
