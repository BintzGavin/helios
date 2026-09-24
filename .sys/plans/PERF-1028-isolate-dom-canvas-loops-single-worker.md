---
id: PERF-1028
slug: isolate-dom-canvas-loops-single-worker
status: complete
claimed_by: "executor"
created: 2024-10-18
completed: ""
result: "improved"
---

# PERF-1028: Isolate DOM and Canvas processing loops in `CaptureLoop.ts` (`hasProcessFn` true and false)

## Focus Area
The single-worker capture loops (`hasProcessFn` true and false paths) inside `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop.ts` file contains the core rendering logic. Previous experiments have demonstrated that checking `isDomStrategy` inside hot loops introduces redundant branch evaluation overhead and limits V8's ability to optimize for the monomorphic DOM and Canvas capture paths.

In `CaptureLoop.ts` (lines 278-327 and 443-485), the `isDomStrategy` check occurs *inside* the outer `while (i < totalFrames - 1 && !aborted)` loop but *outside* the inner `for (; i < chunkEnd; i++)` chunk loops. Although it is already hoisted outside the inner chunk loops, wrapping the entire `while` loop (or isolating the while loops completely) provides a clearer AST and ensures V8 can fully optimize the monomorphic paths without re-evaluating the strategy at every chunk boundary. This also cleans up previous unclaimed optimizations.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant `isDomStrategy` branch evaluation per chunk inside the single-worker capture paths, causing V8 branch prediction overhead.

## Implementation Spec

### Step 1: Isolate `isDomStrategy` in single-worker `hasProcessFn` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Around lines 274-335, locate the `while (i < totalFrames - 1 && !aborted)` loop.
1. Hoist the `if (isDomStrategy)` check to completely wrap the `while` loop.
2. Duplicate the `while` loop into the `if` (DOM) and `else` (Canvas) branches.
3. Inside the DOM branch's `while` loop, remove the `if (isDomStrategy) { ... } else { ... }` check and keep only the DOM logic (`for (; i < chunkEnd; i++) { ... }`).
4. Inside the Canvas branch's `while` loop, keep only the Canvas logic.

### Step 2: Isolate `isDomStrategy` in single-worker `!hasProcessFn` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Around lines 439-498, locate the `while (i < totalFrames - 1 && !aborted)` loop.
1. Apply the same transformation as Step 1: hoist `if (isDomStrategy)` outside the `while` loop.
2. Duplicate the `while` loop into the `if` and `else` branches.
3. Remove the internal `if (isDomStrategy)` checks in both branches, retaining only their respective chunk loop logic.

## Correctness Check
Run the canvas test: `npm run build -w packages/core && npx tsx packages/renderer/tests/verify-canvas-strategy.ts`
Run the dom test: `npm run build -w packages/core && npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`
