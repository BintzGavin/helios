---
id: PERF-762
slug: reapply-has-process-fn
status: unclaimed
claimed_by: ""
created: 2026-06-14
completed: ""
result: ""
---

# PERF-762: Reapply processFn Closure Elimination

## Focus Area
`CaptureLoop.ts` fast path and multi-worker `runWorker` loop.

## Background Research
In PERF-745, we eliminated the allocation and invocation of a bound `processFn` closure per frame in `CaptureLoop.ts` by replacing it with a cached boolean `hasProcessFn = !!strategy.processCaptureResult;`. This was executed and kept because it yielded a significant median render time improvement. However, due to subsequent experimental branching or a codebase rollback, the `processFn` bound closure regression (`const processFn = strategy.processCaptureResult ? strategy.processCaptureResult.bind(strategy) : (res: any) => res;`) was reintroduced into `CaptureLoop.ts`.

This experiment strictly re-applies the PERF-745 `hasProcessFn` inline boolean check to eliminate the per-frame closure evaluation overhead, ensuring V8 can optimize the hot loop linearly without intermediate function boundaries.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Evaluating a bound closure or an anonymous closure (`processFn(rawResult)`) on every single iteration adds measurable micro-overhead inside the rendering fast path.

## Implementation Spec

### Step 1: Replace processFn with hasProcessFn in Single Worker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `if (poolLen === 1)` fast path block:
1. Replace `const processFn = strategy.processCaptureResult ? strategy.processCaptureResult.bind(strategy) : (res: any) => res;` with `const hasProcessFn = !!strategy.processCaptureResult;`
2. Inside the `for` loop, replace `let buffer = processFn(rawResult);` with `let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;`

**Why**: Direct object method invocation guarded by a local boolean is significantly faster than invoking a `.bind()` closure in V8.

### Step 2: Replace processFn with hasProcessFn in Multi Worker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `runWorker` function:
1. Replace `const processFn = strategy.processCaptureResult ? strategy.processCaptureResult.bind(strategy) : (res: any) => res;` with `const hasProcessFn = !!strategy.processCaptureResult;`
2. Inside the `while` loop, replace `let buffer = processFn(rawResult);` with `let buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;`

## Variations
None.

## Canvas Smoke Test
Run `npm run build -w packages/renderer`.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
- PERF-745 (Eliminate processCaptureResult Branching and Inline Closure)
