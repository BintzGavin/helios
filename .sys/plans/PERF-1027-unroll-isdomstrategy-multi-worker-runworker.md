---
id: PERF-1027
slug: unroll-isdomstrategy-multi-worker-runworker
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1027: Unroll `isDomStrategy` check in multi-worker `runWorker` actor loop (`!hasProcessFn` path)

## Focus Area
The multi-worker frame submission loop (`runWorker`) inside `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop.ts` file contains the core rendering logic. For multi-worker rendering, the actor model uses a `runWorker` function to pop frames from the queue and submit them.
Inside the `!hasProcessFn` path of `runWorker` (around line 700), there is a `while (!aborted && nextFrameToSubmit < totalFrames)` loop. Inside this hot loop, an `if (isDomStrategy)` check is evaluated for every frame.
Since `isDomStrategy` is a constant for the duration of the loop, checking it dynamically on every iteration adds redundant branching overhead and prevents V8 from optimizing the loop as heavily for the specific monomorphic capture path. Unswitching this loop (moving the `if` outside the `while`) is a standard optimization that has yielded compound gains in similar parts of the codebase (e.g., PERF-998, PERF-992, PERF-1026).

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The redundant branch evaluation overhead in the multi-worker actor loop, where `isDomStrategy` is checked thousands of times unnecessarily.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` in `runWorker` loop inside `!hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Inside the `runWorker` function (around line 699), locate the `else` block for `!hasProcessFn`.
1. Move the `if (isDomStrategy)` check to wrap the entire `while (!aborted && nextFrameToSubmit < totalFrames)` loop.
2. Duplicate the `while` loop so there is one inside the `if (isDomStrategy)` branch and one inside the `else` branch.
3. In the DOM branch's loop, remove the `else` logic and keep only the `domBeginFrame!()` capture path.
4. In the Canvas branch's loop, remove the `isDomStrategy` logic and keep only the `strategy.capture` path.
**Why**: Eliminates redundant inner `if (isDomStrategy)` branching overhead in the multi-worker non-processing hot loop, reducing AST parsing footprint and improving JIT execution.

## Variations
- Check whether scoping of `maxSubmits` requires the outer variable to be reassigned inside the block correctly without let/var scoping shadowing. Ensure the induction variable loop `let i` is correctly scoped.

## Canvas Smoke Test
Run Canvas smoke tests to verify Canvas path: `npm run build -w packages/core && npm run test -w packages/renderer verify-canvas-strategy.ts`

## Correctness Check
Run DOM smoke tests to verify DOM path: `npm run build -w packages/core && npm run test -w packages/renderer verify-dom-strategy-capture.ts`
