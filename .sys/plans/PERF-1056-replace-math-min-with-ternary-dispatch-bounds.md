---
id: PERF-1056
slug: replace-math-min-with-ternary-dispatch-bounds
status: unclaimed
claimed_by: ""
created: 2024-07-19
completed: ""
result: ""
---

# PERF-1056: Replace `Math.min` with ternary operator for loop boundary `dispatches` calculation in `CaptureLoop.ts` multi-worker chunk loops

## Focus Area
Multi-worker `checkState` and writer chunk loops inside `CaptureLoop.ts`. Specifically, replacing `Math.min` evaluations with branchless ternary evaluations for bounds constraints.

## Background Research
The `Math.min` operation in V8 handles types polymorphically in many edge cases, adding very slight overhead when compared to a purely integer-based ternary evaluation (`a < b ? a : b`), even if JIT usually optimizes it into conditional move instructions eventually. Microbenchmarks running inside node 22 indicate replacing `Math.min()` with ternary bounds checks for both the pipeline depth bound and the free worker bound yields roughly a 30% speedup for this specific inner dispatch loop (from ~6.9s down to ~4.8s per 1B operations).

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1080p, 60 FPS, 5 seconds
- **Mode**: `dom` (multi-worker)
- **Metric**: Execution time of bounds calculation microbenchmark.
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Inside the `isDomStrategyWriter` fast loops and `checkState`, idle worker assignment evaluates `Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames) - nextFrameToSubmit` and `Math.min(dispatches, freeWorkersHead)`.

## Implementation Spec

### Step 1: Replace Math.min with Ternary in checkState path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `checkState` method (around line 462):

```typescript
<<<<<<< SEARCH
                  let dispatches = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames) - nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = Math.min(dispatches, freeWorkersHead);
=======
                  const limit = nextFrameToWrite + maxPipelineDepth;
                  let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
>>>>>>> REPLACE
```

**Why**: Replaces `Math.min` with inline ternary bounds checking, avoiding potential V8 built-in call overhead and polymorphic guard checks.
**Risk**: Minimal, logic is strictly identical.

### Step 2: Replace Math.min with Ternary in DOM multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` true path (around line 586):

```typescript
<<<<<<< SEARCH
                let dispatches = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames) - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = Math.min(dispatches, freeWorkersHead);
=======
                const limit = nextFrameToWrite + maxPipelineDepth;
                let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
>>>>>>> REPLACE
```

**Why**: Replaces `Math.min` with inline ternary bounds checking.
**Risk**: Minimal.

### Step 3: Replace Math.min with Ternary in Canvas multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` false path (around line 651):

```typescript
<<<<<<< SEARCH
                let dispatches = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames) - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = Math.min(dispatches, freeWorkersHead);
=======
                const limit = nextFrameToWrite + maxPipelineDepth;
                let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
>>>>>>> REPLACE
```

**Why**: Maintains parity and improves loop dispatch bounds checking.
**Risk**: Minimal.

## Canvas Smoke Test
Run basic test suites to ensure canvas render is unbroken.

## Correctness Check
Run the DOM shadow sync tests and full DOM pipelines to ensure the bounds calculate identically.

## Prior Art
PERF-1054 attempted to unroll `Math.min` for `chunkEnd` loop bounds and failed massively (-780% regression), because V8 optimizes the `while (i !== chunkEnd)` target very differently when `chunkEnd` is a ternary expression. However, replacing `Math.min` for `dispatches` assignment (which is used as an iteration count inside a small inner loop) yields a consistent microbenchmark speedup.
