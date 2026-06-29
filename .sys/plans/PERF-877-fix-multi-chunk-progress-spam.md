---
id: PERF-877
slug: fix-multi-chunk-progress-spam
status: unclaimed
claimed_by: ""
created: 2024-06-29
completed: ""
result: ""
---

# PERF-877: Fix Progress Spam in Multi-Worker Chunked Loops

## Focus Area
The multi-worker chunked write loops in `CaptureLoop.ts` unconditionally emit progress logs and events at the end of every outer loop iteration, rather than adhering to the `progressInterval` interval.

## Background Research
In recent optimizations (PERF-859, PERF-868), chunked loops were introduced to the multi-worker fast paths in `CaptureLoop.ts`. The inner loops process up to `progressInterval` frames at a time. However, if the inner loop breaks early because a frame is not yet ready (which is common in multi-worker where frames are produced asynchronously out of order), the outer loop emits a progress event immediately, regardless of how many frames were actually processed.

This causes extreme progress spam: it can emit a log and event for every single frame (or even multiple times for the same frame if it has to await `writerWaiterPromise` multiple times), rather than once every `progressInterval` frames. This spams stdout and unnecessarily calls the `onProgress` callback too frequently.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds
- **Mode**: `dom` (multi worker)
- **Metric**: Frequency of `console.log('Progress: ...')` output
- **Minimum runs**: 1 per experiment

## Baseline
- **Bottleneck analysis**: The outer loop in `CaptureLoop.ts` (around lines 1385-1389 and 1426-1430) executes `if (onProgress) onProgress(...)` on every outer iteration, without checking against `nextProgress`.

## Implementation Spec

### Step 1: Restore conditional check for progress emission in multi-worker chunked loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker chunked fast paths (there are two `while (nextFrameToWrite < totalFrames && !aborted)` loops in the base64 string path and buffer path, around lines 1385-1389 and 1426-1430), replace the unconditional progress logging:
```typescript
              console.log(
                `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
              );
              if (onProgress) onProgress(nextFrameToWrite / totalFrames);
```
With a conditional check that uses `nextProgress`, matching the single-worker path's logic (which was fixed during single-worker chunking):
```typescript
              if (nextFrameToWrite >= nextProgress) {
                nextProgress += progressInterval;
                console.log(
                  `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
                );
                if (onProgress) onProgress(nextFrameToWrite / totalFrames);
              }
```

**Why**: Restoring this condition ensures that progress events are only emitted at the correct intervals (`progressInterval`), even when the chunked loop exits early due to unready frames. It eliminates unnecessary I/O spam and callback overhead.
**Risk**: None. This just fixes a bug introduced by loop restructuring.

## Variations
None.

## Canvas Smoke Test
Run `npm test -w packages/renderer` and check stdout. It should no longer spam `Progress: Rendered X / Y` for every single frame.

## Correctness Check
Run the DOM verification script and ensure it succeeds, and that progress is logged cleanly at expected intervals.
