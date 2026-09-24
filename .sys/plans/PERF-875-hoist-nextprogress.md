---
id: PERF-875
slug: hoist-nextprogress
status: unclaimed
claimed_by: ""
created: 2024-06-29
completed: ""
result: ""
---

# PERF-875: Fast Progress Event Emitting

## Focus Area
Removing `if (i - 1 === nextProgress)` branching from inner single-worker capture loops by unrolling the progress event into the outer loop or chunking logic. This targets the Frame Capture Loop (single worker hot path).

## Background Research
Currently in the single-worker capture loops, the inner frame processing loops have a conditional branch to check if progress should be emitted: `if (i - 1 === nextProgress)`. This conditional check is evaluated on *every single frame* processed. V8 has to evaluate this branch inside the tightest inner loop, adding CPU overhead.

Because the chunk size is already `progressInterval`, we can hoist the progress emission entirely out of the inner loop and emit it once per chunk in the outer loop, entirely eliminating the per-iteration branch.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds
- **Mode**: `dom` (single worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Baseline single-worker DOM loop microbenchmark time
- **Bottleneck analysis**: The inner `for` loops evaluate `if (i - 1 === nextProgress) nextProgress += progressInterval;` per iteration.

## Implementation Spec

### Step 1: Remove the conditional check from inner loops in CaptureLoop.ts
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Remove the following blocks inside the single worker fast path inner loops:
```typescript
if (i === nextProgress) {
  nextProgress += progressInterval;
  console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
  if (onProgress) {
    onProgress(i / totalFrames);
  }
}
```
And its variant:
```typescript
if (i - 1 === nextProgress) nextProgress += progressInterval;
```

### Step 2: Add progress event emission to the outer loop scope
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
The chunk loops are already bounded by `progressInterval` (via `const chunkEnd = Math.min(i + progressInterval, totalFrames - 1)`).
Therefore, after the inner `for (; i < chunkEnd; i++)` loop finishes, we know exactly `progressInterval` frames (or the remainder) have been processed. We can emit progress right after the inner loop without needing a per-frame `if` statement!

Place the `console.log` and `onProgress` emission exactly after the inner `for` loops in the single-worker path.
```typescript
if (i > 0) {
    console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
    if (onProgress) {
        onProgress(i / totalFrames);
    }
}
```
**Why**: This replaces N branches per chunk (where N is `progressInterval`) with 0 branches, while keeping progress reporting identical.
**Risk**: Progress events might be slightly misaligned by 1 frame depending on whether we emit before or after the outer loop counter increments. (Needs careful alignment to ensure it still prints exactly at multiples of `progressInterval`).

## Variations
None.

## Canvas Smoke Test
Run `npm test -w packages/renderer` or basic rendering script to ensure progress output looks normal.

## Correctness Check
Run existing DOM tests and check if progress callbacks are still firing roughly correctly.

## Prior Art
- PERF-868 (Math.min chunking) bounds the loop by `progressInterval`.
