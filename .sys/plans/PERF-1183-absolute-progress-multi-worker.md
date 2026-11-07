---
id: PERF-1183
slug: absolute-progress-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-1183: Replace Dynamic Progress Counter with Absolute Progress Bounds in Multi-Worker Loop

## Focus Area
The progress calculation and loop boundary logic within the multi-worker writer loops of `CaptureLoop.ts` (around lines 508-600).

## Background Research
Currently, the multi-worker writer loop manages progress chunking using a relative dynamic `progressCounter` which represents the remaining frames until the next progress log. On every iteration of the outer chunking loop, it computes the absolute chunk end boundary `const chunkEnd = Math.min(nextFrameToWrite + progressCounter, totalFrames);`, executes the writes, and then subtracts the number of successfully written frames from the relative counter `const isProgress = !(progressCounter -= nextFrameToWrite - startWrite);`.

This requires maintaining a relative variable, recalculating the absolute bound on every iteration (`nextFrameToWrite + progressCounter`), and performing dynamic mutable subtraction (`progressCounter -= ...`).

Instead, we can maintain an absolute target frame `let nextProgress = Math.min(progressInterval, totalFrames);`. The chunk boundary becomes simply `nextProgress`, avoiding the `nextFrameToWrite + progressCounter` addition on every loop iteration. The progress check becomes a simple equality `if (nextFrameToWrite === nextProgress)`, avoiding the dynamic subtraction.

This aligns perfectly with PERF-1182 (which removed relative progress counter math in the single-worker path) by applying a similar structural simplification to the multi-worker loop, eliminating loop-carried mutations and conditional subtractions inside the AST.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1080p, 60fps, 10 seconds (dom mode)
- **Mode**: `dom` (multi-worker path)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The multi-worker writer wait loop iterates frequently (breaking early if frames are not yet generated). The current dynamic progress subtraction runs on every such partial-chunk iteration, introducing AST arithmetic and assignment overhead.

## Implementation Spec

### Step 1: Replace `progressCounter` with Absolute `nextProgress`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Above the multi-worker `while` loop (around line 508), replace `let progressCounter = progressInterval;` with:
   ```typescript
   let nextProgress = Math.min(progressInterval, totalFrames);
   ```
2. Inside the `while` loop, remove `const startWrite = nextFrameToWrite;`.
3. Replace the `chunkEnd` calculation with:
   ```typescript
   const chunkEnd = nextProgress;
   ```
4. Remove the `const isProgress = !(progressCounter -= nextFrameToWrite - startWrite);` line.
5. Update the progress check block:
   ```typescript
            if (nextFrameToWrite === nextProgress) {
              console.log(
                `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
              );
              if (onProgress) onProgress(nextFrameToWrite / totalFrames);
              nextProgress = Math.min(nextProgress + progressInterval, totalFrames);
            }
   ```
**Why**: This replaces relative offset arithmetic (which requires subtraction and addition per-chunk-iteration) with absolute frame boundaries, simplifying the V8 AST representation and reducing register mutations.
**Risk**: Potential progress log timing changes if `nextFrameToWrite` overshoots `nextProgress`. However, since the inner loop guarantees `nextFrameToWrite !== chunkEnd` (where `chunkEnd === nextProgress`), it will stop exactly at `nextProgress`, making `nextFrameToWrite === nextProgress` a safe and exact check.

## Correctness Check
Run the DOM rendering tests to verify that `onProgress` is still called correctly at the expected intervals and that the total render frame output remains exact.

## Prior Art
Builds upon PERF-1182, which successfully removed relative progress tracking in the single-worker capture loop. This plan ports the same architectural simplification to the more complex multi-worker loop.
