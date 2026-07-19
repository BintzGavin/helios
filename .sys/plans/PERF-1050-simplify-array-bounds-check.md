---
id: PERF-1050
slug: simplify-array-bounds-check
status: unclaimed
claimed_by: ""
created: 2026-07-19
completed: ""
result: ""
---

# PERF-1050: Simplify array bounds tracking variables `nextFrameToWrite` vs `totalFrames` using strict equality in CaptureLoop.ts

## Focus Area
The multi-worker writer loops in `CaptureLoop.ts` (`isDomStrategyWriter` and `!isDomStrategyWriter` branches).

## Background Research
Currently, inside `CaptureLoop.ts` multi-worker chunk dispatch logic (around line 583 and 641), the main loops have the condition:
`while (nextFrameToWrite < totalFrames && !aborted)`

However, in the exact same paths, we have tight inner loops that are heavily bounded by `chunkEnd` and boundary limits. Because `nextFrameToWrite` strictly increments inside the innermost synchronous loops, and because `nextFrameToWrite` fundamentally cannot exceed `totalFrames` due to the explicit loop limits of `chunkEnd` (`Math.min(nextFrameToWrite + progressInterval, totalFrames)`), the relational operator `<` is mathematically redundant.

Instead of `< totalFrames`, we can simply use `!== totalFrames`. V8's TurboFan compiler can execute strict equality (`!==`) slightly faster than relational checks (`<`) within loop headers because relational checks require numeric comparisons with potential floating-point fallback semantics (unless explicitly cast as SMI, which V8 usually manages, but `!==` is mathematically branchless and guarantees primitive identity). Microbenchmark history (like PERF-911 and PERF-937) indicates replacing `>=` or `<` with strict equality `===` or `!==` for logically guaranteed boundary conditions yields small (1-3%) performance improvements in dynamic loop evaluations.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition.
- **Render Settings**: High FPS / high frame count to maximize loop iteration testing.
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time / loop execution speed.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Current estimated render time**: Baseline from previous runs.
- **Bottleneck analysis**: Micro-optimizing dynamic bounds evaluations in Node.js/V8 inside tight hot paths.

## Implementation Spec

### Step 1: Replace `<` with `!==` in `isDomStrategyWriter` multi-worker chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` path (around line 583):
```typescript
            while (nextFrameToWrite !== totalFrames && !aborted) {
```
(Changing `while (nextFrameToWrite < totalFrames && !aborted) {`)

### Step 2: Replace `<` with `!==` in `!isDomStrategyWriter` multi-worker chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `!isDomStrategyWriter` path (around line 641):
```typescript
            while (nextFrameToWrite !== totalFrames && !aborted) {
```
(Changing `while (nextFrameToWrite < totalFrames && !aborted) {`)

**Why**: By replacing the relational check with strict identity, V8 can bypass relational numeric branching checks in the main loop headers since the bound cannot logically be exceeded.
**Risk**: Negligible. Due to the explicit `chunkEnd` math logic inside the loop, `nextFrameToWrite` cannot exceed `totalFrames`, so `!==` is identical logically to `<`.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/canvas-smoke.ts` (or similar) to verify Canvas path still works.

## Correctness Check
Verify DOM outputs using a standard render test.

## Prior Art
PERF-911 and PERF-937 successfully replaced relational boundary checks with strict equality checks in `CaptureLoop.ts`.
