---
id: PERF-979
slug: remove-dead-has-process-fn-matrix
status: unclaimed
claimed_by: ""
created: 2024-07-12
completed: ""
result: ""
---

# PERF-979: Eliminate dead code matrix from CaptureLoop hot paths

## Focus Area
The single-worker and multi-worker `runWorker` fast loops in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the nested `if (hasProcessFn)` and `if (isDomStrategy)` branches.

## Background Research
The renderer instantiates only two strategies via `Renderer.ts`: `DomStrategy` and `CanvasStrategy`.
- `DomStrategy` defines `processCaptureResult`, so `hasProcessFn = true`. It creates a CDP session, so `isDomStrategy = true`.
- `CanvasStrategy` does NOT define `processCaptureResult` (look at `CanvasStrategy.ts` which has no `processCaptureResult` method defined), so `hasProcessFn = false`. It lacks a CDP session, so `isDomStrategy = false`.

Therefore, `hasProcessFn` is logically identical to `isDomStrategy`. The current code evaluates a 2x2 matrix of branches for these variables:
```typescript
if (hasProcessFn) {
  if (isDomStrategy) { /* DOM */ } else { /* DEAD */ }
} else {
  if (isDomStrategy) { /* DEAD */ } else { /* CANVAS */ }
}
```
This forces V8 to parse, compile, and maintain hidden classes for nearly 400 lines of mathematically unreachable code inside the application's hottest loops, degrading JIT optimization efficiency and inflating AST footprint.

Furthermore, analyzing the multi-worker path, a highly optimized DOM execution block (using inlined `domBeginFrame` and `domLastFrameBuffer`) was incorrectly placed under the `!hasProcessFn -> if (isDomStrategy)` branch. Because `DomStrategy` actually has `processCaptureResult`, `hasProcessFn` is `true`, meaning `DomStrategy` in multi-worker currently falls into the unoptimized `hasProcessFn = true` path instead of its intended optimized path!
By removing `hasProcessFn` entirely and using only `isDomStrategy`, we can correctly route `DomStrategy` to its optimized path while eliminating hundreds of lines of dead code.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single and multi worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: JIT compilation and V8 engine parsing overhead is needlessly inflated by phantom branches in the hot path. In multi-worker, the DOM path is executing an unoptimized code block due to contradictory boolean branch conditions.

## Implementation Spec

### Step 1: Unroll and eliminate dead code in single-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker loop (around line 198):
1. Replace the `if (hasProcessFn) { ... } else { ... }` block with a single `if (isDomStrategy) { ... } else { ... }`.
2. The new `if (isDomStrategy)` block should contain ONLY the code from the previous `hasProcessFn = true` -> `if (isDomStrategy)` path (i.e., `nextCapturePromise = domBeginFrame!()`, etc.).
3. The new `else` block should contain ONLY the code from the previous `!hasProcessFn` -> `else` path (the Canvas path).
4. Delete all other unreachable code blocks.

### Step 2: Unroll and eliminate dead code in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` block (around line 736):
1. Replace the `if (hasProcessFn) { ... } else { ... }` matrix with `if (isDomStrategy) { ... } else { ... }`.
2. The new `if (isDomStrategy)` block should contain the highly optimized DOM code currently under `!hasProcessFn -> if (isDomStrategy)` (around line 779-829, utilizing `domBeginFrame!()` and `Buffer.from(domLastFrameData)`).
3. The new `else` block should contain the Canvas code currently under `!hasProcessFn -> else` (around line 830-869, utilizing `await strategy.capture(page, i * timeStep)`).
4. Delete the current `hasProcessFn = true` block entirely (line 738-778) because the inlined DOM logic is better and `CanvasStrategy` doesn't use it.

### Step 3: Clean up redundant variable
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove all declarations of `const hasProcessFn = !!strategy.processCaptureResult;` (lines 160 and 717).

**Why**: By eliminating this dead code matrix and properly routing `DomStrategy` to its highly optimized inlined path (which was previously hidden behind a mathematically contradictory branch condition), we reduce V8 AST size and guarantee the fastest execution path is used for multi-worker DOM rendering.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` and `npm test -w packages/renderer` to ensure nothing is broken.
