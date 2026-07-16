---
id: PERF-1022
slug: isolate-dom-canvas-chunks-unroll
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1022: Isolate DOM and Canvas chunks and unroll conditionals in `CaptureLoop.ts`

## Focus Area
The single-worker fast chunk rendering loops and the multi-worker writer loops in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop.ts` file contains the core rendering loop, which dominates render time. Previous experiments have shown that removing redundant polymorphic checks inside hot loops yields substantial performance benefits (e.g. PERF-988, PERF-998, PERF-882, PERF-996).
Several optimizations were already planned but are unclaimed or out of sync (PERF-1010, PERF-1011, PERF-1015, PERF-1019, PERF-1020, PERF-1021). This plan consolidates them to clean up the AST and eliminate redundant JIT branch parsing.

- **PERF-1020 & PERF-1010**: In the single-worker paths (both `hasProcessFn` and `!hasProcessFn`), `isDomStrategy` is evaluated inside the tight `for` loops thousands of times. Since it is constant throughout the loop, wrapping the chunk loop in an outer `if (isDomStrategy)` eliminates the condition from the hot path.
- **PERF-1015**: In the multi-worker `!hasProcessFn` path, the `isDomStrategy` check routes execution between the DOM strategy and the Canvas strategy inside a while loop. Because `isDomStrategy` is a loop-invariant boolean constant evaluated *before* the loop, we can hoist this conditional outside the loop to eliminate dynamic branch prediction overhead.
- **PERF-1019**: In the multi-worker path, there is a redundant first-frame write loop (`while (!aborted) { ... break; }`) immediately preceding the main chunk writer loop (`while (nextFrameToWrite < totalFrames && !aborted)`). The chunk loop can perfectly handle the first frame, making the first loop just AST bloat.
- **PERF-1011**: Inside the multi-worker chunk writer loop, `stream.write` and `length` property access are polymorphic (`buffer` can be `Buffer` or `string`). Branching on `isDomStrategyWriter` outside the loop isolates these paths, providing V8 with a guaranteed monomorphic context.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas multi-worker benchmarks
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant `isDomStrategy` branches, polymorphic buffer operations, and redundant loops cause unnecessary branch evaluation and PIC misses on every frame.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` in single-worker `hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, find the chunk loop inside the `if (hasProcessFn)` block (around lines 274-327). Unroll it by pulling `if (isDomStrategy)` outside the `for` loop.
In the DOM branch, remove `timePromise` since it is not awaited and use `Buffer` typed writing. In the Canvas branch, keep `timePromise` and cast to `any`.

### Step 2: Hoist `isDomStrategy` in single-worker `!hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, find the chunk loop inside the `else` block for `!hasProcessFn` (around lines 422-473). Unroll it by pulling `if (isDomStrategy)` outside the `for` loop, similarly to Step 1.

### Step 3: Hoist `isDomStrategy` out of the `!hasProcessFn` loop in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the single `while` loop that contains `if (isDomStrategy)` in the `!hasProcessFn` `else` block (around line 664) with two separate `while` loops, conditioned on an outer `if (isDomStrategy)` check.

### Step 4: Remove redundant first-frame loop in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Around line 721, remove the entire `while (!aborted) { ... break; }` block, and the wrapping `if (!aborted)` around the subsequent `while (nextFrameToWrite < totalFrames && !aborted)`.

### Step 5: Unroll buffer type dispatch in multi-worker writer chunk
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Around line 790, within the main chunk writer loop (`while (nextFrameToWrite < totalFrames && !aborted)`), duplicate the inner `while (nextFrameToWrite < chunkEnd)` loop and wrap it in an `if (isDomStrategyWriter)`. Inside the DOM branch, cast buffer to `Buffer`. Inside the Canvas branch, cast to `any`.

## Verification Steps
1. Run Canvas smoke tests to verify Canvas path: `npm run build -w packages/core && npm run test -w packages/renderer verify-canvas-strategy.ts`
2. Run DOM smoke tests to verify DOM path: `npm run build -w packages/core && npm run test -w packages/renderer verify-dom-strategy-capture.ts`
3. Run all renderer tests: `npm run test -w packages/renderer`
