---
id: PERF-908
slug: exact-dispatch-unrolling
status: unclaimed
claimed_by: ""
created: 2024-07-04
completed: ""
result: ""
---
# PERF-908: Exact Dispatch Unrolling for Multi-Worker Loops

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - The free worker dispatch loop in the multi-worker paths.

## Background Research
Currently, the multi-worker fast loops (both in `runWorker` and the main writer loops) coordinate frame assignments using a `while` loop evaluated up to 6 times per frame block.
```typescript
while (
  freeWorkersHead > 0 &&
  nextFrameToSubmit < totalFrames &&
  nextFrameToSubmit < maxSubmits
) {
  // pop worker and assign frame
}
```
V8 evaluates these 3 boundary conditions and 2 logical AND operators on *every* single dispatch assignment inside the tight hot-path.
Because `totalFrames` and `maxSubmits` are constant within the loop's outer scope, and `nextFrameToSubmit` increments predictably by 1, we can precalculate the exact number of required iterations before the loop starts. By determining `dispatches` dynamically, we eliminate the runtime boundary checks entirely and reduce loop evaluation overhead from 3 comparisons per frame to just 1 decrement counter.

## Benchmark Configuration
- **Composition URL**: Any standard DOM or Canvas composition
- **Render Settings**: Standard 1080p, 60fps
- **Mode**: `dom` and `canvas` (Multi-Worker concurrency: 4)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The redundant evaluation of boundaries (`nextFrameToSubmit < totalFrames`, `freeWorkersHead > 0`) per assignment adds pure CPU overhead inside the multi-worker orchestration fast path.

## Implementation Spec

### Step 1: Unroll Dynamic Conditions in Free Worker Dispatch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate all 6 instances where the `freeWorkersHead` dispatch `while` loop occurs (around lines 984, 1051, 1120, 1182 inside `runWorker`, and lines 1289, 1356, 1419 inside the writer loops).

Replace:
```typescript
const maxSubmits = nextFrameToWrite + maxPipelineDepth;
while (
  freeWorkersHead > 0 &&
  nextFrameToSubmit < totalFrames &&
  nextFrameToSubmit < maxSubmits
) {
  const w = freeWorkers[--freeWorkersHead];
  const n = nextFrameToSubmit++;
  const ringIndex = n & ringMask;
  frameBufferRing[ringIndex] = null;
  workerThenables[w].resolve(n);
}
```

With:
```typescript
const maxSubmits = nextFrameToWrite + maxPipelineDepth;
const limit = maxSubmits < totalFrames ? maxSubmits : totalFrames;
let dispatches = limit - nextFrameToSubmit;
if (dispatches > 0) {
  if (dispatches > freeWorkersHead) dispatches = freeWorkersHead;
  while (dispatches-- > 0) {
    const w = freeWorkers[--freeWorkersHead];
    const n = nextFrameToSubmit++;
    frameBufferRing[n & ringMask] = null;
    workerThenables[w].resolve(n);
  }
}
```
**Why**: Precalculating the maximum bound converts 3 dynamic comparisons into a single integer decrement per assignment.

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run verify-canvas` to ensure multi-worker worker pools remain stable.

## Correctness Check
Run multi-worker DOM verify scripts to ensure workers are still dispatched in order and never exceed bounds.
