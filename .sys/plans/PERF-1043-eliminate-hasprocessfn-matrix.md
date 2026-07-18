---
id: PERF-1043
slug: eliminate-hasprocessfn-matrix
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1043: Eliminate hasProcessFn matrix completely

## Focus Area
`CaptureLoop.ts` single-worker and multi-worker hot loops.

## Background Research
The `hasProcessFn` boolean was originally used to determine if a strategy had a synchronous `processCaptureResult` step.
However:
1. `CanvasStrategy` returns buffers directly from `capture()` and does not implement `processCaptureResult` (`hasProcessFn = false`).
2. `DomStrategy` does implement `processCaptureResult`, but the highly optimized DOM execution paths inside `CaptureLoop.ts` have completely inlined the caching and buffer allocation logic (`Buffer.from()`), bypassing `processCaptureResult` entirely.

As a result, `hasProcessFn` is a redundant abstraction that creates a mathematically unreachable 2x2 matrix of code blocks in both the single-worker and multi-worker execution paths:

- Single worker `hasProcessFn = true -> !isDomStrategy` is unreachable.
- Single worker `hasProcessFn = false -> isDomStrategy` is unreachable.
- Multi-worker `hasProcessFn = true` block is mathematically unreachable because `isDomStrategy` is evaluated first and fully handles the DOM strategy.

By replacing the `if (hasProcessFn)` and `if (isDomStrategy)` matrix with a simple top-level `if (isDomStrategy) { ... } else { ... }`, we can delete hundreds of lines of dead code, drastically shrinking the AST, reducing V8 parsing/compilation overhead, and allowing the JIT to better optimize the hot loops.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 compiler parses and generates bytecode for massive unreachable blocks within the hot loop closures, bloating AST size and causing unnecessary branching overhead.

## Implementation Spec

### Step 1: Eliminate matrix in single-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker block (around line 194), remove the `if (hasProcessFn)` wrapper and replace the logic with:
```typescript
        if (isDomStrategy) {
          // Keep ONLY the contents of the former `hasProcessFn = true -> isDomStrategy = true` block.
        } else {
          // Keep ONLY the contents of the former `hasProcessFn = false -> isDomStrategy = false` block.
        }
```
Delete all code corresponding to the dead `hasProcessFn = true -> !isDomStrategy` and `hasProcessFn = false -> isDomStrategy` blocks.

### Step 2: Eliminate dead `hasProcessFn` block in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function (around line 736), change the condition from:
```typescript
        if (isDomStrategy) {
          // DOM block
        } else if (hasProcessFn) {
          // DEAD BLOCK
        } else {
          // Canvas block
        }
```
To simply:
```typescript
        if (isDomStrategy) {
          // DOM block
        } else {
          // Canvas block
        }
```
Delete the entire `else if (hasProcessFn)` block.

### Step 3: Remove `hasProcessFn` variable declarations
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Delete the `const hasProcessFn = !!strategy.processCaptureResult;` lines from both the single-worker (around line 160) and multi-worker `runWorker` (around line 741) sections.

## Correctness Check
Run the general test suite to verify everything remains functional:
`npm run test -w packages/renderer`
