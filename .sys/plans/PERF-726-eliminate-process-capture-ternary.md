---
id: PERF-726
slug: eliminate-process-capture-ternary
status: complete
claimed_by: ""
created: 2027-02-18
completed: "2026-06-10"
result: "Discarded - The experiment resulted in a regression. The overhead of calling an identity function unconditionally was slightly higher than the V8 property truthiness check."
---
# PERF-726: Eliminate Optional Branching in processCaptureResult

## Focus Area
The hot path in `CaptureLoop.ts` currently performs an optional method check (`strategy.processCaptureResult ? strategy.processCaptureResult(rawResult) : rawResult`) on every single frame captured, both in the single-worker fast path and the multi-worker loop.

## Background Research
During the execution of PERF-724, `processCaptureResult` was introduced as an optional synchronous hook to `RenderStrategy` to allow `DomStrategy` to unwrap `result.screenshotData` without injecting a Promise `.then()` chain. However, because the hook is optional, `CaptureLoop.ts` executes a ternary truthiness branch for every frame:

```typescript
const buffer = strategy.processCaptureResult ? strategy.processCaptureResult(rawResult) : rawResult;
```

While V8 is exceptionally good at inline caching for monomorphic shapes, evaluating a truthy branch on an object property for every frame introduces a tiny overhead in the pipeline. In performance-critical hot loops, straight-line monomorphic execution paths are strictly preferred. By making `processCaptureResult` a mandatory method on the `RenderStrategy` interface, we can remove the ternary branch entirely and rely purely on V8's fast monomorphic property lookup and function dispatch.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/tests/benchmarks/dom-heavy
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.317s (from PERF-725)
- **Bottleneck analysis**: Micro-optimizing the inner CaptureLoop tight loop execution path by removing branching.

## Implementation Spec

### Step 1: Make `processCaptureResult` mandatory
**File**: `packages/renderer/src/strategies/RenderStrategy.ts`
**What to change**: Change `processCaptureResult?(rawResult: any): string | Buffer;` to `processCaptureResult(rawResult: any): string | Buffer;`.
**Why**: Ensures all strategies explicitly handle their own result processing, allowing the caller to bypass conditional logic.

### Step 2: Implement identity function in `CanvasStrategy`
**File**: `packages/renderer/src/strategies/CanvasStrategy.ts` (or wherever implemented)
**What to change**: Add `processCaptureResult(rawResult: any): string | Buffer { return rawResult; }`.
**Why**: `CanvasStrategy` already returns a Buffer directly from `capture()`, so it just needs to pass the result through.

### Step 3: Remove ternary branch in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: In both the single-worker and multi-worker loops, change:
`const buffer = strategy.processCaptureResult ? strategy.processCaptureResult(rawResult) : rawResult;`
to:
`const buffer = strategy.processCaptureResult(rawResult);`
**Why**: Eliminates the conditional branch, providing a single straight-line execution path for V8 to optimize.

## Correctness Check
Run `npm run test -w packages/renderer` and ensure tests pass, specifically checking that `CanvasStrategy` renders still succeed.

## Prior Art
- PERF-724 introduced `processCaptureResult` as optional.
- PERF-618 avoided media sync branching by relying on a monomorphic empty function instead of a boolean check.


## Results Summary

```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	2.177	150	68.89	63.1	keep	baseline (re-run on new environment)
2	2.174	150	69.00	63.1	keep	eliminate processCaptureResult ternary
3	2.205	150	68.02	63.3	keep	eliminate processCaptureResult ternary
4	2.237	150	67.07	63.0	keep	eliminate processCaptureResult ternary
5	2.586	150	58.00	63.1	discard	test with identity CanvasStrategy.processCaptureResult (slower)
6	2.333	150	64.31	63.3	discard	test with identity CanvasStrategy.processCaptureResult (slower)
```
