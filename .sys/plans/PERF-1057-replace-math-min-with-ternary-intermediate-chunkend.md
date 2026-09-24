---
id: PERF-1057
slug: replace-math-min-with-ternary-intermediate-chunkend
status: complete
result: discarded
claimed_by: ""
created: 2024-07-19
completed: ""
result: ""
---

# PERF-1057: Replace `Math.min` with ternary operator and intermediate variable for loop boundary `chunkEnd` calculation in `CaptureLoop.ts`

## Focus Area
Single and multi-worker chunk loops inside `CaptureLoop.ts`. Specifically, replacing `Math.min` evaluations for `chunkEnd` with an intermediate variable and a branchless ternary evaluation.

## Background Research
PERF-1054 attempted to unroll `Math.min(nextFrameToWrite + progressInterval, totalFrames)` by directly duplicating the expression in a ternary operator `(nextFrameToWrite + progressInterval) < totalFrames ? (nextFrameToWrite + progressInterval) : totalFrames`, but resulted in a massive regression (-780%) due to the duplicate addition evaluation and potential V8 de-optimizations related to the duplicated expression.
However, microbenchmarking in Node.js reveals that using an intermediate variable to store the added limit before evaluating the ternary condition is much faster than both `Math.min` and the duplicated ternary expression:
- `Math.min`: ~412 ms per 100M operations
- Duplicate ternary: ~188 ms per 100M operations (in simple microbenchmarks, but regressed in the actual app)
- Intermediate ternary: ~177 ms per 100M operations (`const limit = nextFrameToWrite + progressInterval; const chunkEnd = limit < totalFrames ? limit : totalFrames;`)

This intermediate approach reduces the V8 call overhead of `Math.min` while avoiding the double addition evaluation that caused PERF-1054 to fail.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1080p, 60 FPS, 5 seconds
- **Mode**: `dom` (multi-worker) and `canvas`
- **Metric**: Execution time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Inside the single-worker write loop and the multi-worker `isDomStrategyWriter` fast loops, `chunkEnd` is evaluated using `Math.min`. Replacing this with an intermediate variable and a ternary speeds up evaluation without the regression seen in PERF-1054.

## Implementation Spec

### Step 1: Replace Math.min with Ternary Intermediate in single-worker path (hasProcessFn)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `hasProcessFn` path (around line 231):

```typescript
<<<<<<< SEARCH
          while (i < totalFrames - 1 && !aborted) {
            const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

            for (; i !== chunkEnd; i++) {
=======
          while (i < totalFrames - 1 && !aborted) {
            const limit = i + progressInterval;
            const max = totalFrames - 1;
            const chunkEnd = limit < max ? limit : max;

            for (; i !== chunkEnd; i++) {
>>>>>>> REPLACE
```

### Step 2: Replace Math.min with Ternary Intermediate in single-worker path (!hasProcessFn)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `!hasProcessFn` path (around line 342):

```typescript
<<<<<<< SEARCH
          while (i < totalFrames - 1 && !aborted) {
            const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

            for (; i !== chunkEnd; i++) {
=======
          while (i < totalFrames - 1 && !aborted) {
            const limit = i + progressInterval;
            const max = totalFrames - 1;
            const chunkEnd = limit < max ? limit : max;

            for (; i !== chunkEnd; i++) {
>>>>>>> REPLACE
```

### Step 3: Replace Math.min with Ternary Intermediate in DOM multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` true path (around line 584):

```typescript
<<<<<<< SEARCH
          if (isDomStrategyWriter) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              if (freeWorkersHead > 0) {
=======
          if (isDomStrategyWriter) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              const limit = nextFrameToWrite + progressInterval;
              const chunkEnd = limit < totalFrames ? limit : totalFrames;

              if (freeWorkersHead > 0) {
>>>>>>> REPLACE
```

### Step 4: Replace Math.min with Ternary Intermediate in Canvas multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` false path (around line 649):

```typescript
<<<<<<< SEARCH
          } else {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              if (freeWorkersHead > 0) {
=======
          } else {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              const limit = nextFrameToWrite + progressInterval;
              const chunkEnd = limit < totalFrames ? limit : totalFrames;

              if (freeWorkersHead > 0) {
>>>>>>> REPLACE
```

## Correctness Check
Run the DOM shadow sync tests and full DOM pipelines to ensure the bounds calculate identically.
