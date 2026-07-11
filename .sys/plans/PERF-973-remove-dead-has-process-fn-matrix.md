---
id: PERF-973
slug: remove-dead-has-process-fn-matrix
status: unclaimed
claimed_by: ""
created: 2024-07-11
completed: ""
result: ""
---

# PERF-973: Eliminate dead code matrix from CaptureLoop hot paths

## Focus Area
The single-worker and multi-worker `runWorker` fast loops in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the nested `if (hasProcessFn)` and `if (isDomStrategy)` branches.

## Background Research
The renderer instantiates only two strategies via `Renderer.ts`: `DomStrategy` and `CanvasStrategy`.
- `DomStrategy` defines `processCaptureResult`, so `hasProcessFn = true`. It creates a CDP session, so `isDomStrategy = true`.
- `CanvasStrategy` does NOT define `processCaptureResult`, so `hasProcessFn = false`. It lacks a CDP session, so `isDomStrategy = false`.

Therefore, `hasProcessFn` is logically identical to `isDomStrategy`. The current code evaluates a 2x2 matrix of branches for these variables:
```typescript
if (hasProcessFn) {
  if (isDomStrategy) { /* DOM */ } else { /* DEAD */ }
} else {
  if (isDomStrategy) { /* DEAD */ } else { /* CANVAS */ }
}
```
This forces V8 to parse, compile, and maintain hidden classes for nearly 400 lines of mathematically unreachable code inside the application's hottest loops, degrading JIT optimization efficiency and inflating AST footprint.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single and multi worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: JIT compilation and V8 engine parsing overhead is needlessly inflated by phantom branches in the hot path.

## Implementation Spec

### Step 1: Unroll and eliminate dead code in single-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker loop (around line 198):
1. Replace the massive `if (hasProcessFn) { ... } else { ... }` block with a single `if (isDomStrategy) { ... } else { ... }`.
2. The new `if (isDomStrategy)` block should contain ONLY the code from the previous `hasProcessFn = true` -> `isDomStrategy = true` path.
3. The new `else` block should contain ONLY the code from the previous `hasProcessFn = false` -> `else (!isDomStrategy)` path (the Canvas path).
4. Delete the unreachable code blocks.

### Step 2: Unroll and eliminate dead code in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` block (around line 736):
1. Replace the `if (hasProcessFn) { ... } else { ... }` matrix with `if (isDomStrategy) { ... } else { ... }`.
2. The new `if (isDomStrategy)` block should contain ONLY the code from the previous `hasProcessFn = true` -> `isDomStrategy = true` path.
3. The new `else` block should contain ONLY the code from the previous `hasProcessFn = false` -> `else (!isDomStrategy)` path (the Canvas path).
4. Delete the unreachable code blocks.

**Why**: By eliminating this dead code, we reduce V8 AST and bytecode size, allowing the JIT compiler to optimize the hot loops faster and more efficiently without maintaining bailout paths for unreachable type evaluations.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure nothing is broken.
