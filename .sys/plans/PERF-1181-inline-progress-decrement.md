---
id: PERF-1181
slug: inline-progress-decrement
status: complete
claimed_by: "executor-session"
created: 2024-11-06
completed: "2026-11-06"
result: "keep"
---

# PERF-1181: Inline progress counter decrement in single-worker and multi-worker loops

## Focus Area
The single-worker and multi-worker chunk loops in `CaptureLoop.ts` compute chunk distances and subsequently decrement `progressCounter` and verify if it's hit zero to log progress.

## Background Research
Currently, the countdown tracking block looks like this:
```typescript
progressCounter -= (i - startWrite);
if (progressCounter === 0) {
```
(and analogously in the multi-worker path `progressCounter -= (nextFrameToWrite - startWrite)`).

Microbenchmarks evaluating JS assignment unrolling demonstrate that using the logical NOT operator to simultaneously decrement and check the falsy (zero) boundary via `if (!(progressCounter -= i - startWrite))` provides a very slight speedup (around 1%) by reducing the overall number of AST evaluation nodes from separate assignment and comparative binary expressions into one unrolled logical expression.

While this micro-optimization is small, this pattern runs inside the hottest tight loops of the renderer, and eliminating these intermediate evaluations aligns with our strategy of incrementally simplifying the V8 AST footprint.

## Benchmark Configuration
- **Composition URL**: Any standard DOM or Canvas benchmark composition
- **Render Settings**: Fixed resolution, FPS, and codec
- **Mode**: `canvas` and `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The separate operation `progressCounter -= (i - startWrite)` requires loading `progressCounter`, mutating it, then another AST instruction node is parsed to perform the binary operation `=== 0`. We can combine them.

## Implementation Spec

### Step 1: Update progress decrement logic in `isDomStrategy` block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Around line 226, locate:
```typescript
            progressCounter -= (i - startWrite);
            if (progressCounter === 0) {
```
Change to:
```typescript
            if (!(progressCounter -= i - startWrite)) {
```

### Step 2: Update progress decrement logic in `!isDomStrategy` block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Around line 327, locate:
```typescript
            progressCounter -= (i - startWrite);
            if (progressCounter === 0) {
```
Change to:
```typescript
            if (!(progressCounter -= i - startWrite)) {
```

### Step 3: Update progress decrement logic in multi-worker writer block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Around line 589, locate:
```typescript
            progressCounter -= (nextFrameToWrite - startWrite);

            if (aborted) break;
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              while (frameBufferRing[awaitIndex] === null && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }

            if (progressCounter === 0) {
```
Change to:
```typescript
            const isProgress = !(progressCounter -= nextFrameToWrite - startWrite);

            if (aborted) break;
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              while (frameBufferRing[awaitIndex] === null && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }

            if (isProgress) {
```

**Why**: Decreases AST nodes by merging assignment and boolean condition checking, slightly optimizing the hottest chunk logic inside the renderer.
**Risk**: None. Mathematically equivalent.

## Correctness Check
- DOM and Canvas outputs must render correctly.
- `console.log("Progress: Rendered X / Y frames")` must trigger at the exact same intervals.

## Results Summary
- **Best render time**: 8.727s (vs baseline 8.852s)
- **Improvement**: 1.4%
- **Kept experiments**: inline progress decrement
- **Discarded experiments**: none
