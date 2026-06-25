---
id: PERF-851
slug: counter-based-progress-check
status: discarded
claimed_by: ""
created: 2024-06-25
completed: ""
result: superseded-by-852
---

# PERF-851: Replace Modulo Progress Check with Fast Counter

## Focus Area
The single-worker and multi-worker hot paths in `CaptureLoop.ts` evaluate `i % progressInterval === 0` inside the tightest inner loops (e.g. 8 separate `for` loops in the single-worker path).

## Background Research
Modulo arithmetic (`%`) is computationally expensive in V8 compared to simple integer addition and equality checks. The progress logging code executes every frame inside the inner fast loops:
```typescript
if (i % progressInterval === 0 || i === totalFrames - 1) {
  // ... log progress ...
}
```
By substituting the modulo check with a counter or threshold variable initialized outside the loop, we eliminate the costly division operation per frame:
```typescript
let nextProgress = progressInterval;
// inside loop:
if (i === nextProgress || i === totalFrames - 1) {
  if (i === nextProgress) nextProgress += progressInterval;
  // ... log progress ...
}
```
In high-throughput microbenchmarks, eliminating modulo operations in hot loops can significantly reduce CPU overhead and improve V8 pipeline prediction.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Microbenchmark loop iteration time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The modulo division operation requires multiple CPU cycles. While seemingly small, it happens on every frame in the tightly optimized V8 fast paths.

## Implementation Spec

### Step 1: Replace modulo with counter in single-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, immediately before the first `for` loop (around line 339), initialize:
```typescript
let nextProgress = progressInterval;
```
Then, inside the 8 inner `for` loops (e.g., around lines 339, 411, 468, 518, 654, 727, 773, 820), replace:
```typescript
if (i % progressInterval === 0 || i === totalFrames - 1) {
```
with:
```typescript
if (i === nextProgress || i === totalFrames - 1) {
  if (i === nextProgress) nextProgress += progressInterval;
```

### Step 2: Replace modulo in multi-worker writer path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker paths (around lines 1163, 1238, 1272), replace:
```typescript
if (currentFrame % progressInterval === 0) {
```
and
```typescript
if (!aborted && (nextFrameToWrite % progressInterval === 0 || nextFrameToWrite === totalFrames)) {
```
with an equivalent fast-counter logic. Introduce a `let nextProgressToWrite = progressInterval;` outside the writer loop, and use `if (nextFrameToWrite === nextProgressToWrite || nextFrameToWrite === totalFrames)` to trigger logging, incrementing `nextProgressToWrite += progressInterval`.

## Variations
None.

## Correctness Check
Run the vitest test suite (`npx vitest run --passWithNoTests packages/renderer/`). Check the console output to ensure progress logs still emit at the correct intervals (e.g., 0%, 10%, 20%...).
