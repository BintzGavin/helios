---
id: PERF-893
slug: remove-math-min
status: unclaimed
claimed_by: ""
created: 2026-06-19
completed: ""
result: ""
---

# PERF-893: Remove Math.min from Multi-Worker Dispatch

## Focus Area
The multi-worker loop dispatch logic in `CaptureLoop.ts`.

## Background Research
Currently, when assigning tasks to waiting workers, the code precalculates `maxSubmits` using `Math.min`:
`const maxSubmits = Math.min(totalFrames, nextFrameToWrite + maxPipelineDepth);`
It then uses this in a `while` loop: `while (freeWorkersHead > 0 && nextFrameToSubmit < maxSubmits)`.
Based on V8 optimizations, replacing `Math.min(a, b)` inside tight loops with direct boolean checks (`< a && < b`) avoids function call overhead and is more performant. By precalculating `const maxSubmits = nextFrameToWrite + maxPipelineDepth;` and modifying the condition to `nextFrameToSubmit < totalFrames && nextFrameToSubmit < maxSubmits`, we can save branch evaluation overhead.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60fps, multi-worker mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Synchronous function call overhead (`Math.min`) in the V8 hot loop dispatch condition.

## Implementation Spec

### Step 1: Remove `Math.min`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate all 8 occurrences of:
```typescript
const maxSubmits = Math.min(totalFrames, nextFrameToWrite + maxPipelineDepth);
while (
  freeWorkersHead > 0 &&
  nextFrameToSubmit < maxSubmits
)
```
And replace them with:
```typescript
const maxSubmits = nextFrameToWrite + maxPipelineDepth;
while (
  freeWorkersHead > 0 &&
  nextFrameToSubmit < totalFrames &&
  nextFrameToSubmit < maxSubmits
)
```
**Why**: Replaces `Math.min` with inline boolean evaluation, allowing V8 to optimize the branch more efficiently.
**Risk**: None, logic is mathematically identical.

## Variations
None.

## Canvas Smoke Test
Run `npm test -w packages/renderer` to ensure basic multi-worker capture loops still function correctly.

## Correctness Check
Run the standard test suite to ensure dispatch works exactly as before.
