---
id: PERF-1026
slug: isolate-dom-canvas-chunks-unroll
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1026: Isolate DOM and Canvas chunks and unroll conditionals in `CaptureLoop.ts`

## Focus Area
The single-worker fast chunk rendering loops and the multi-worker writer loops in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop.ts` file contains the core rendering loop, which dominates render time. Previous experiments have shown that removing redundant polymorphic checks inside hot loops yields substantial performance benefits (e.g. PERF-988, PERF-998, PERF-882, PERF-996).
Several optimizations were already planned but are unclaimed or out of sync (PERF-1010, PERF-1011, PERF-1019, PERF-1020). This plan consolidates them to clean up the AST and eliminate redundant JIT branch parsing.

- **PERF-1020 & PERF-1010**: In the single-worker path, `isDomStrategy` is evaluated inside the tight `for` loops thousands of times. Since it is constant throughout the loop, wrapping the chunk loop in an outer `if (isDomStrategy)` eliminates the condition from the hot path.
- **PERF-1019**: In the multi-worker path, there is a redundant first-frame write loop (`while (!aborted) { ... break; }`) immediately preceding the main chunk writer loop (`while (nextFrameToWrite < totalFrames && !aborted)`). The chunk loop can perfectly handle the first frame, making the first loop just AST bloat.
- **PERF-1011**: Inside the multi-worker chunk writer loop, `stream.write` and `length` property access are polymorphic (`buffer` can be `Buffer` or `string`). Branching on `isDomStrategyWriter` outside the loop isolates these paths, providing V8 with a guaranteed monomorphic context.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The redundant branch evaluation overhead for logically guaranteed checks and redundant chunk worker blocks that add to AST evaluation sizes.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` in single-worker `hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Unroll the inner chunk loop (around line 278). Wrap the `for (; i < chunkEnd; i++)` in an `if (isDomStrategy)` check. In the DOM branch, remove `timePromise` since it is not awaited and use `Buffer` typed writing. In the Canvas branch, keep `timePromise` and cast to `any`.

### Step 2: Hoist `isDomStrategy` in single-worker `!hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Unroll the inner chunk loop (around line 425). Similar to Step 1, wrap the `for (; i < chunkEnd; i++)` in an `if (isDomStrategy)` check.

### Step 3: Remove redundant first-frame loop in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Around line 721, remove the entire `while (!aborted) { ... break; }` block, and the wrapping `if (!aborted)` around the subsequent `while (nextFrameToWrite < totalFrames && !aborted)`.

### Step 4: Unroll buffer type dispatch in multi-worker writer chunk
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Around line 790, within the main chunk writer loop (`while (nextFrameToWrite < totalFrames && !aborted)`), duplicate the inner `while (nextFrameToWrite < chunkEnd)` loop and wrap it in an `if (isDomStrategyWriter)`. Inside the DOM branch, cast buffer to `Buffer`. Inside the Canvas branch, cast to `any`.

## Verification Steps
1. Run Canvas smoke tests to verify Canvas path: `npm run build -w packages/core && npm run test -w packages/renderer verify-canvas-strategy.ts`
2. Run DOM smoke tests to verify DOM path: `npm run build -w packages/core && npm run test -w packages/renderer verify-dom-strategy-capture.ts`
3. Run all renderer tests: `npm run test -w packages/renderer`
