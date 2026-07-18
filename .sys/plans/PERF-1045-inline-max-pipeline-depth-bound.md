---
id: PERF-1045
slug: inline-max-pipeline-depth-bound
status: unclaimed
claimed_by: ""
created: 2024-07-18
completed: ""
result: ""
---

# PERF-1045: Inline loop bound evaluation for `Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames)` in CaptureLoop.ts

## Focus Area
Frame dispatch limits logic within the main multi-worker writer chunk loops in `CaptureLoop.ts`.

## Background Research
Currently, the multi-worker chunk dispatch paths evaluate:
```typescript
const maxSubmits = nextFrameToWrite + maxPipelineDepth;
const limit = Math.min(maxSubmits, totalFrames);
let dispatches = limit - nextFrameToSubmit;
```
For every iteration of the chunk loop (`while (nextFrameToWrite < totalFrames && !aborted)`), this intermediate `maxSubmits` variable is assigned and then passed to `Math.min()`. Under TurboFan, this involves multiple AST nodes and assignments.
Since `maxPipelineDepth` is guaranteed to be positive and non-mutating inside these tight chunk loops, and `nextFrameToWrite` increments predictably, we can simplify this logic to evaluate in fewer instructions. While an earlier experiment (PERF-947) showed that simply inlining `Math.min` limit calculations in some blocks was a "scientifically invalid optimization", PERF-1044 proved that dynamically re-evaluating pipeline depths with bounds yields measurable wall-clock improvements by eliminating stale caching logic. We can combine these operations into a single expression `const limit = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames);` reducing the number of variables tracking the pipeline bounds.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 19.500s
- **Bottleneck analysis**: Micro-optimizing bounds check evaluation overhead in multi-worker frame generation loops.

## Implementation Spec

### Step 1: Remove redundant variable `maxSubmits` in DOM strategy multi-worker chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` truthy branch, around line 597:
```typescript
<<<<<<< SEARCH
              if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                const limit = Math.min(maxSubmits, totalFrames);
                let dispatches = limit - nextFrameToSubmit;
=======
              if (freeWorkersHead > 0) {
                const limit = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames);
                let dispatches = limit - nextFrameToSubmit;
>>>>>>> REPLACE
```
**Why**: Reduces local variables and JIT evaluation steps.
**Risk**: None, standard inlining.

### Step 2: Remove redundant variable `maxSubmits` in Canvas strategy multi-worker chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` falsy branch, around line 664:
```typescript
<<<<<<< SEARCH
              if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                const limit = Math.min(maxSubmits, totalFrames);
                let dispatches = limit - nextFrameToSubmit;
=======
              if (freeWorkersHead > 0) {
                const limit = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames);
                let dispatches = limit - nextFrameToSubmit;
>>>>>>> REPLACE
```
**Why**: Reduces local variables and JIT evaluation steps.
**Risk**: None, standard inlining.

## Correctness Check
Run canvas smoke test and microbenchmarks. Confirm standard DOM paths still render correctly.
