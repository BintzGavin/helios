---
id: PERF-736
slug: eliminate-process-capture-bind
status: unclaimed
claimed_by: ""
created: 2026-06-10
completed: ""
result: ""
---

# PERF-736: Eliminate native .bind() for processCaptureResult in CaptureLoop

## Focus Area
The setup phase of the `CaptureLoop.ts` frame processing loops (both single-worker and multi-worker paths).

## Background Research
Currently, `CaptureLoop.ts` sets up the `processFn` variable for processing captured frames using `const processFn = strategy.processCaptureResult ? strategy.processCaptureResult.bind(strategy) : (res: any) => res;`. Native `Function.prototype.bind()` creates a bound function exotic object. In V8, standard closures `(res) => strategy.processCaptureResult!(res)` are often better optimized and avoid this specific exotic object allocation. Replacing `.bind()` with a closure might allow the JIT compiler to inline or optimize the hot loop calls more effectively.

## Benchmark Configuration
- **Composition URL**: [The standard DOM benchmark composition]
- **Render Settings**: [Resolution, FPS, duration, codec — must be identical across all runs]
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~23.422s (median from PERF-725)
- **Bottleneck analysis**: Micro-allocations and execution context for `processFn` in the hot loop.

## Implementation Spec

### Step 1: Update processFn assignment in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Modify the `processFn` assignment in both the single worker fast path and the multi-worker path. Change:
`const processFn = strategy.processCaptureResult ? strategy.processCaptureResult.bind(strategy) : (res: any) => res;`
to:
`const processFn = strategy.processCaptureResult ? (res: any) => strategy.processCaptureResult!(res) : (res: any) => res;`
**Why**: Replaces native `.bind()` with a standard V8 closure, which is generally better optimized for hot loop execution.
**Risk**: Minimal. `this` context is still preserved via the lexical closure calling `strategy.processCaptureResult()`.

## Correctness Check
Run the `dom` benchmark (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) and verify output video generation completes successfully without errors.

## Prior Art
- PERF-726 tried to make `processCaptureResult` a mandatory method with an identity function for `CanvasStrategy` to eliminate a ternary check. However, the overhead of unconditionally invoking an object method per-frame was slightly higher than V8's native property truthiness check, causing a regression, so it was discarded. This new plan specifically targets eliminating the native `.bind()` allocation during setup, instead using a standard V8 closure, while preserving the ternary check that was proven necessary by PERF-726.
