---
id: PERF-1192
slug: eliminate-redundant-ast-scopes
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-1192: Eliminate redundant AST scopes and inline assignments in CaptureLoop.ts

## Focus Area
Single-worker and multi-worker fast paths in `CaptureLoop.ts`. Specifically targeting V8 AST parser overhead by removing redundant wrapper blocks, deduplicating try/catch structures, and inlining assignment operators in hot worker-dispatch loops.

## Background Research
Prior experiments (e.g., PERF-1130, PERF-1155, PERF-1163, PERF-1181, PERF-1190) have repeatedly shown that shrinking the AST footprint inside `CaptureLoop.ts` by removing redundant scopes and intermediate statements yields measurable performance gains. V8's TurboFan compiler and Ignition interpreter benefit when there are fewer AST nodes to traverse, especially in high-frequency event loops like the capture/writer pipeline. This experiment continues that trajectory by hoisting duplicate error handlers, stripping a redundant conditional wrapper, and utilizing pre/post-increment inline assignments.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/
- **Render Settings**: 1080p, 60fps, 2 seconds, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.241s (from journal)
- **Bottleneck analysis**: The capture loop contains duplicated error-handling blocks, redundant wrapper conditions, and multi-line assignments that increase parser complexity and evaluation overhead inside V8.

## Implementation Spec

### Step 1: Hoist `try-catch` blocks in single-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker fast path, there are two identical `try...catch...finally` blocks duplicated inside the `if (isDomStrategy)` and `else` branches.
- Move the `try {` block to start immediately BEFORE the `if (isDomStrategy)` check.
- Hoist the declaration `let nextCapturePromise: any = null;` just above the `if (isDomStrategy)` so it is shared.
- Remove the inner `try`, `catch`, and `finally` wrappers from both the `if` and `else` blocks.
- Add a single, unified `catch (e)` and `finally` block at the end of the `if/else` block.
**Why**: Reduces AST size by deduplicating identical exception-handling nodes.
**Risk**: Variable scoping issues if variables inside the blocks aren't correctly hoisted. (Checked: only `nextCapturePromise` needs to be hoisted).

### Step 2: Remove redundant `if` wrapper in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path (around line 506), remove the redundant `if (nextFrameToWrite < totalFrames && !aborted)` wrapper that completely encloses the `while (nextFrameToWrite !== totalFrames && !aborted)` loop. Be sure to remove the corresponding closing brace.
**Why**: The `while` loop natively evaluates and handles this exact condition. Removing the wrapper eliminates a useless block scope and branch evaluation.
**Risk**: Negligible, functionally identical.

### Step 3: Inline prefix/postfix assignments in worker dispatch loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker dispatcher (inside `checkState` and inside the writer loop), combine the increment/decrement assignment statements in all 5 places where `workerThenables` is resolved:
- **Replace**:
  ```typescript
  h--;
  workerThenables[freeWorkers[h]].resolve(n);
  n++;
  ```
  **With**:
  ```typescript
  workerThenables[freeWorkers[--h]].resolve(n++);
  ```
- **Replace**:
  ```typescript
  head--;
  const w = freeWorkers[head];
  workerThenables[w].resolve(-1);
  ```
  *(and similar `h--` blocks for `-1`)*
  **With**:
  ```typescript
  workerThenables[freeWorkers[--head]].resolve(-1); // or --h
  ```
**Why**: Folds multiple imperative statements into a single expression, reducing AST instruction count inside the hot dispatch loops.
**Risk**: Prefix/postfix evaluation order must be exact (`--h` to decrement first, `n++` to use original then increment).

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode=canvas` to ensure the canvas fallback path functions correctly with the hoisted `try-catch`.

## Correctness Check
Verify `npx tsx scripts/benchmark-perf.ts --mode=dom` correctly completes without errors, and no frames are skipped or deadlocked at the end of the render.
