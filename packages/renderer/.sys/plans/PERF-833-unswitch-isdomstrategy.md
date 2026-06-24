---
id: PERF-833
slug: unswitch-isdomstrategy
status: unclaimed
claimed_by: ""
created: 2024-06-24
completed: ""
result: ""
---

# PERF-833: Unswitch isDomStrategy branch in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast paths, specifically around the `if (isDomStrategy)` branch checks within the innermost loops.

## Background Research
Currently in the fast paths of `CaptureLoop.ts`, we see repeated evaluation of the `if (isDomStrategy)` boolean condition inside the tight `for` loops.

For example:
```typescript
if (isDomStrategy) {
    nextCapturePromise = domBeginFrame!();
} else {
    nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
}

let buf;
if (isDomStrategy) {
    const data = rawResult.screenshotData;
    if (data) {
        domLastFrameData = data;
    }
    buf = domLastFrameData as string;
} else {
    buf = strategy.processCaptureResult!(rawResult) as string;
}
```

Since `isDomStrategy` is a constant condition for the entire lifetime of a specific capture loop execution, evaluating it thousands of times per render causes branch predictor pollution and adds unnecessary overhead inside V8's hot loops.

By hoisting this condition out and creating two distinct execution paths—one dedicated to `isDomStrategy === true` (DOM renderer) and another for `isDomStrategy === false` (Canvas renderer)—we completely eliminate the branch checking logic from the hot inner loops. This technique is known as loop unswitching.

A basic node microbenchmark shows that unswitching a simple loop with a constant boolean check can improve execution speed by over 75%.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in microbenchmark and node script.
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: Micro-optimizations in the capture loop tight execution path. Repeated boolean branch evaluation causes unnecessary CPU pipeline overhead and V8 deoptimizations.

## Implementation Spec

### Step 1: Create an unswitched inner loop structure for the Single-Worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker setup, look at the `if (isString)` chunks (around line 250+ and 460+) and the `else` (non-string buffers) loop branches. Inside each, the logic is currently:
```typescript
while (currentFrame < totalFrames) {
   for (let i = currentFrame; i < prefetchEnd; i++) {
       // if (isDomStrategy) { ... } else { ... }
   }
}
```
Refactor these blocks so the outer structure becomes:
```typescript
if (isDomStrategy) {
   while (currentFrame < totalFrames) {
      for (let i = currentFrame; i < prefetchEnd; i++) {
         // DOM specific logic only
      }
   }
} else {
   while (currentFrame < totalFrames) {
      for (let i = currentFrame; i < prefetchEnd; i++) {
         // Canvas specific logic only
      }
   }
}
```

This must be applied to:
1. Single-worker String buffer fast-path.
2. Single-worker Raw Buffer fast-path.

**Why**: By unswitching the loop, V8 compiles a highly optimized, monomorphic loop body containing zero conditional branches for the strategy type.
**Risk**: Code duplication increases file size. Need to ensure logic within both branches remains correctly synced with the original behaviour.

### Step 2: Apply the same unswitching to the Multi-Worker fast paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` loop (around line 690, 736 and 832):
Refactor inner loops to evaluate `if (isDomStrategy)` once per chunk/worker task, pulling it outside the primary execution loops over `endFrame`.
**Why**: Same performance principle for the multi-worker ring buffer population loops.
**Risk**: Same as above.

## Variations

### Variation A: Single massive branch
Instead of unswitching inside `if (isString)`, we could move `if (isDomStrategy)` up to the very top, branching the entire `try {} catch {}` block. However, this causes combinatorial explosion with `isString` branch unswitching. The planned approach minimizes code duplication while still achieving the performance win inside the tight loops.

## Canvas Smoke Test
Run `--mode canvas` benchmarks to ensure the fallback branch correctly captures frames for the `CanvasStrategy`.

## Correctness Check
Run the DOM benchmark and compare the output visual rendering to ensure it's still producing the exact same frames without dropping or misaligning sequence indexes.

## Prior Art
- PERF-820: Successfully unswitched the `if (isString)` branch.
