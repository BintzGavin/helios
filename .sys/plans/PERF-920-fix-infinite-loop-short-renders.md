---
id: PERF-920
slug: fix-infinite-loop-short-renders
status: unclaimed
claimed_by: ""
created: 2024-07-06
completed: ""
result: ""
---
# PERF-920: Fix Infinite Loop on Short Renders by Enforcing Minimum Progress Interval

## Focus Area
`CaptureLoop.ts` - Initialization of `progressInterval` for chunked rendering boundaries.

## Background Research
In single-worker chunked loops, the `progressInterval` is currently calculated at initialization time:
```typescript
const progressInterval = Math.floor(totalFrames / 10);
```

When rendering very short sequences where `totalFrames < 10` (e.g., a single frame thumbnail render or a 5-frame preview), `progressInterval` evaluates to `0`.

Later in the chunked fast paths, the chunk boundary is computed using `progressInterval`:
```typescript
let chunkEnd = i + progressInterval; if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;
for (; i < chunkEnd; i++) {
  // process frames
}
```

If `progressInterval` is `0` and `i` is not yet at the very end, `chunkEnd` becomes `i` (or is clamped to `totalFrames - 1` if we're at the very end). If `chunkEnd === i`, the `for` loop condition `i < i` immediately evaluates to false, so the inner loop never executes. Consequently, `i` never increments.
However, the outer `while` loop condition `i < totalFrames - 1` remains true, creating a permanent infinite loop. This completely hangs the renderer process for any composition with fewer than 10 frames.

Using an inline conditional `let progressInterval = Math.floor(totalFrames / 10); if (progressInterval < 1) progressInterval = 1;` guarantees progress is always made and avoids the hang.

## Benchmark Configuration
- **Composition URL**: Any short composition (< 10 frames)
- **Render Settings**: Standard, but `frameCount: 5`
- **Mode**: `dom` (single-worker)
- **Metric**: Execution completion
- **Minimum runs**: 1

## Baseline
- **Bottleneck analysis**: Infinite loop caused by `0` progress chunking.

## Implementation Spec

### Step 1: Enforce minimum `progressInterval`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the initialization of `progressInterval` (around line 141).
From:
```typescript
const progressInterval = Math.floor(totalFrames / 10);
```
To:
```typescript
let progressInterval = Math.floor(totalFrames / 10);
if (progressInterval < 1) progressInterval = 1;
```

**Why**: Prevents zero-width chunking that leads to an infinite loop for short renders without invoking function overhead.

## Variations
None.

## Canvas Smoke Test
None.

## Correctness Check
Run FFmpeg verify scripts with a 5-frame composition to ensure they complete successfully.
