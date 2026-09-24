---
id: PERF-981
slug: unroll-is-dom-strategy-single-worker
status: unclaimed
claimed_by: ""
created: 2024-07-12
completed: ""
result: ""
---

# PERF-981: Unroll redundant isDomStrategy checks in single-worker fast paths

## Focus Area
The single-worker fast loops in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the inner `if (isDomStrategy)` checks in the chunked rendering loops.

## Background Research
In the single-worker path of `CaptureLoop.ts`, the execution branches heavily based on whether `isDomStrategy` is true (which historically aligned with `hasProcessFn`).
Currently, after entering the top-level block `if (isDomStrategy)` (e.g., around line 204 or 420 after PERF-979 removed the `hasProcessFn` matrix), the code enters an initial setup phase. Afterwards, it handles chunked processing (the main body of the rendering). In this chunked processing section, there is *another* check: `if (isDomStrategy) { ... } else { ... }`.
Because the execution is already inside a block where `isDomStrategy` is logically guaranteed to be true (or false for the canvas path), this inner branch is mathematically tautological. The `else` block inside an `if (isDomStrategy)` path is fundamentally dead code. Removing it unrolls the AST, decreases JIT parser overhead, and shrinks the memory footprint of the hot loops.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: JIT compilation and V8 engine parsing overhead is needlessly inflated by phantom branches in the hot path.

## Implementation Spec

### Step 1: Unroll tautological `isDomStrategy` in DOM chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the inner `if (isDomStrategy)` condition in the single worker DOM chunk loop.
1. Remove the `if (isDomStrategy) {` wrapper (and unindent its contents).
2. Delete its corresponding `} else { ... }` block entirely, since it handles Canvas logic that is unreachable here.

### Step 2: Unroll tautological `!isDomStrategy` in Canvas chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the inner `if (isDomStrategy)` condition in the single worker Canvas chunk loop (the top-level `else` block).
1. Delete the `if (isDomStrategy) { ... }` block entirely, since it handles DOM logic that is unreachable here.
2. Remove the `} else {` wrapper (and unindent its contents) for the Canvas chunk logic.

**Why**: By eliminating this dead code, we reduce V8 AST and bytecode size, allowing the JIT compiler to optimize the hot loops faster and more efficiently without maintaining bailout paths for unreachable type evaluations.

## Correctness Check
Run `npm test -w packages/renderer` to ensure nothing is broken.
