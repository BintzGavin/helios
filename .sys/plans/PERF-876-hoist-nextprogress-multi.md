---
id: PERF-876
slug: hoist-nextprogress-multi
status: unclaimed
claimed_by: ""
created: 2024-06-29
completed: ""
result: ""
---

# PERF-876: Fast Progress Event Emitting (Multi-Worker Path)

## Focus Area
Removing `if (nextFrameToWrite === nextProgress)` branching from inner multi-worker write loops in `CaptureLoop.ts` by unrolling the progress event into the outer loop scope. This targets the Frame Capture Loop (multi worker hot path).

## Background Research
Currently in the multi-worker write loop paths, the inner frame processing loops have a conditional branch to check if progress should be emitted: `if (nextFrameToWrite === nextProgress)`. This conditional check is evaluated on *every single frame* written. V8 has to evaluate this branch inside the tightest inner loop, adding CPU overhead.

Because the chunk size is already `progressInterval` (via `Math.min(nextFrameToWrite + progressInterval, totalFrames)`), we can hoist the progress emission entirely out of the inner loop and emit it once per chunk in the outer loop, completely eliminating the per-iteration branch, similar to what we did in the single-worker path.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds
- **Mode**: `dom` (multi worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Baseline multi-worker DOM write loop microbenchmark time
- **Bottleneck analysis**: The inner loops in multi-worker evaluate `if (nextFrameToWrite === nextProgress) nextProgress += progressInterval;` per iteration.

## Implementation Spec

### Step 1: Remove the conditional check from inner loops in CaptureLoop.ts (Multi-Worker Write Loop)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Remove the following blocks inside the multi worker fast path inner loops (around lines ~1200+):
```typescript
if (currentFrame === nextProgress) {
  nextProgress += progressInterval;
  console.log(`Progress: Rendered ${currentFrame} / ${totalFrames} frames`);
  if (onProgress) {
    onProgress(currentFrame / totalFrames);
  }
}
```
*Note: Depending on exact variable names, it might be `currentFrame`, `nextFrameToWrite`, or similar. Check the actual multi-worker `while` loop that writes to FFmpeg.*

### Step 2: Add progress event emission to the outer loop scope
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Place the `console.log` and `onProgress` emission exactly after the inner fast loops in the multi-worker path.
```typescript
if (currentFrame >= nextProgress) {
    nextProgress += progressInterval;
    console.log(`Progress: Rendered ${currentFrame} / ${totalFrames} frames`);
    if (onProgress) {
        onProgress(currentFrame / totalFrames);
    }
}
```
**Why**: This replaces N branches per chunk (where N is `progressInterval`) with 0 branches in the inner loop, while keeping progress reporting identical.
**Risk**: None. It's semantically equivalent, just faster.

## Variations
None.

## Canvas Smoke Test
Run `npm test -w packages/renderer` or basic rendering script to ensure progress output looks normal.

## Correctness Check
Run existing DOM tests and check if progress callbacks are still firing correctly.

## Prior Art
- PERF-875 (Fast Progress Event Emitting Single-Worker Path)
- PERF-868 (Math.min chunking) bounds the loop by `progressInterval`.
