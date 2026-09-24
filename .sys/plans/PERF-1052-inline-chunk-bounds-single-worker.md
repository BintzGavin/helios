---
id: PERF-1052
slug: inline-chunk-bounds-single-worker
status: complete
claimed_by: "PERF-1052"
created: 2026-07-19
completed: ""
result: "improved"
---

# PERF-1052: Inline loop bound evaluation for chunk end condition in single-worker paths of CaptureLoop.ts

## Focus Area
The single-worker `hasProcessFn` path in `CaptureLoop.ts` (`isDomStrategy` and `!isDomStrategy` branches around lines 231 and 342).

## Background Research
Building on the successful PERF-1051 experiment (which simplified `chunkEnd` loop boundary tracking in the multi-worker writer loops), there is identical relational bounded tracking in the single-worker `hasProcessFn` loops.

Currently:
```typescript
          let i = 1;
          while (i < totalFrames - 1 && !aborted) {
            const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

            for (; i < chunkEnd; i++) {
```

Because `i` increments by exactly 1 in the inner loop and is explicitly limited by `chunkEnd`, using the strict inequality `<` check evaluates a dynamic numeric relation on each iteration. By replacing `<` with `!==` in the inner loop header:
```typescript
            for (; i !== chunkEnd; i++) {
```

V8 can optimize this branch to a strict identity check instead of a relational float evaluation. As seen in PERF-1050 and PERF-1051, strict equality (`!==`) reduces branch evaluator overhead in highly repeated V8 loops where the step and limit naturally align.

## Benchmark Configuration
- **Composition URL**: Any standard DOM or Canvas benchmark composition.
- **Render Settings**: Single worker, high FPS.
- **Mode**: `dom` and `canvas`
- **Metric**: Micro-level parser overhead / JS execution speed.
- **Minimum runs**: 3 per experiment.

## Implementation Spec

### Step 1: Replace `<` with `!==` in `isDomStrategy` single-worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker `hasProcessFn` path for DOM strategy (around line 233):
```typescript
<<<<<<< SEARCH
            for (; i < chunkEnd; i++) {
=======
            for (; i !== chunkEnd; i++) {
>>>>>>> REPLACE
```

### Step 2: Replace `<` with `!==` in `!isDomStrategy` single-worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker `hasProcessFn` path for non-DOM strategy (around line 344):
```typescript
<<<<<<< SEARCH
            for (; i < chunkEnd; i++) {
=======
            for (; i !== chunkEnd; i++) {
>>>>>>> REPLACE
```

## Canvas Smoke Test
Run `node -e "/* quick canvas render to verify no breakage */"` after.
Test rendering: `npx tsx tests/run-all.ts`

## Pre-commit Step
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

## Submit Step
Submit the changes with a PR describing the optimization.
