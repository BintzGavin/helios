---
id: PERF-1058
slug: inline-chunk-bounds-single-worker-while
status: complete
claimed_by: "executor-session"
created: 2024-07-19
completed: 2026-07-19
result: no-improvement
---

# PERF-1058: Inline chunk bounds in single-worker !hasProcessFn paths

## Focus Area
The single-worker paths (both DOM and Canvas) inside `CaptureLoop.ts` (`!hasProcessFn` branch). Specifically, the main frame loop boundaries that currently use `i < totalFrames - 1` with a `chunkEnd` intermediate assignment via `Math.min`.

## Background Research
In single-worker chunking loops (lines 230 and 341 in `CaptureLoop.ts`), the loop condition checks `i < totalFrames - 1` and evaluates `chunkEnd` via `Math.min(i + progressInterval, totalFrames - 1)`. In PERF-1050 and PERF-1051, we observed that replacing `<` with strict equality `!==` on strictly monotonically increasing integer bounds reduces V8 dynamic evaluator branching complexity, yielding consistent 3-7% improvements in microbenchmarks. Here we can replace `i < totalFrames - 1` with `i !== totalFrames - 1` for the main loop, mirroring the successful optimization applied to the multi-worker paths in PERF-1051. (Note: inlining Math.min as a ternary was tested and rejected due to performance drops, so we stick to strict equality bound checks which gave positive results).

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Fixed (no changes to frame size or composition layout)
- **Mode**: `dom` (single-worker via `maxWorkers: 1` implicitly if used)
- **Metric**: Wall-clock render time in seconds (via microbenchmarking Node scripts)
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The outer single-worker while loops evaluate a relational `<` check for every chunk iteration against `totalFrames - 1`. Because `i` strictly approaches `totalFrames - 1` (via the inner `for` loops ending exactly at `chunkEnd`), it is logically guaranteed never to bypass it.

## Implementation Spec

### Step 1: Replace Relational bounds with Strict Equality in Single-worker loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Find the two `while (i < totalFrames - 1 && !aborted) {` lines inside the `!hasProcessFn` branch of `CaptureLoop.ts` (currently around line 230 for DOM and line 341 for Canvas).
Replace `i < totalFrames - 1` with `i !== totalFrames - 1`.

**Why**: By asserting exact bounds, the V8 TurboFan compiler skips less-than/greater-than bounds mapping instructions, lowering AST complexity for outer chunk bounds.
**Risk**: None, integer arithmetic logic is mathematically equivalent because `chunkEnd` strictly clamps at `totalFrames - 1`.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to execute all existing Jest snapshot smoke tests in CI environment to verify single-worker Canvas correctness.

## Correctness Check
Since `chunkEnd = Math.min(i + progressInterval, totalFrames - 1)` ensures `i` resolves exactly to `totalFrames - 1` at the very end, strict equality is fully type and bounds safe.


## Results Summary
- **Best render time**: 1.210s (vs baseline 1.180s)
- **Improvement**: 2.5% regression
- **Kept experiments**:
  None
- **Discarded experiments**:
  - Inline chunk bounds in single-worker paths
