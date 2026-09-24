---
id: PERF-909
slug: precalculate-pipeline-bound-single
status: unclaimed
claimed_by: ""
created: 2024-07-04
completed: ""
result: ""
---
# PERF-909: Precalculate Pipeline Submits Bound in Single-Worker Loop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - The single-worker dispatch/fallback loops evaluating `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth`.

## Background Research
Inside `CaptureLoop.ts`, there are loops that evaluate `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth` per iteration. By hoisting the calculation to `const maxSubmits = nextFrameToWrite + maxPipelineDepth; const limit = maxSubmits < totalFrames ? maxSubmits : totalFrames;` and replacing the `while` loop condition to `while (!aborted && nextFrameToSubmit < limit)`, we eliminate a dynamic subtraction and branch evaluation on every fast-path iteration.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard 1080p, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Dynamic subtraction inside tight loops is a known V8 execution overhead.

## Implementation Spec

### Step 1: Hoist and Unroll Pipeline Check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate all instances of:
```typescript
while (!aborted && nextFrameToSubmit < totalFrames) {
  let i: number;
  if (
    nextFrameToSubmit - nextFrameToWrite <
    maxPipelineDepth
  ) {
    i = nextFrameToSubmit++;
    const ringIndex = i & ringMask;
    // ...
```
And replace the loop structure with:
```typescript
const maxSubmits = nextFrameToWrite + maxPipelineDepth;
const limit = maxSubmits < totalFrames ? maxSubmits : totalFrames;
while (!aborted && nextFrameToSubmit < limit) {
  const i = nextFrameToSubmit++;
  const ringIndex = i & ringMask;
  // ... continue inner logic
```
Ensure the `else` branch (which queues the worker and potentially resolves the writer promise if aborted) is correctly handled either outside the loop or if the loop terminates early.

**Why**: Precalculating the maximum bound converts dynamic comparisons into a single integer limit check.

## Variations
None.

## Canvas Smoke Test
No canvas test needed, verifying via file read.

## Correctness Check
Run multi-worker DOM verify scripts to ensure workers are still dispatched in order and never exceed bounds.
