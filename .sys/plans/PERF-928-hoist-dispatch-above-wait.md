---
id: PERF-928
slug: hoist-dispatch-above-wait
status: unclaimed
claimed_by: ""
created: 2024-07-06
completed: ""
result: ""
---
# PERF-928: Hoist Worker Dispatch Above Writer Wait Block

## Focus Area
`CaptureLoop.ts` - Multi-worker writer chunk loops.

## Background Research
In the multi-worker paths, the writer processes frames in chunks. If the writer encounters a missing frame (`frameBufferRing[ringIndex] === null`), it breaks out of its inner fast loop and waits for a worker to produce the frame by `await`ing `writerWaiterPromise`.
Crucially, the code that dispatches idle workers (`if (freeWorkersHead > 0) { ... }`) is currently located *after* this wait block. This creates a severe pipeline stall.
By hoisting the free worker dispatch block to execute *before* the wait loop, we guarantee that idle workers are immediately put to work on the next frames before the main thread yields to the event loop.

## Benchmark Configuration
- **Composition URL**: Standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Workers remain idle while the writer is blocked waiting for frames, because the dispatch logic runs after the wait block instead of before it, leading to pipeline starvation.

## Implementation Spec

### Step 1: Hoist Dispatch Block in DOM Writer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` block, locate the wait block:
```typescript
              if (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                while (frameBufferRing[ringIndex] === null && !aborted) {
                  await writerWaiterPromise;
                }
                if (aborted) break;
              } else if (aborted) {
                break;
              }
```
And the dispatch block immediately following it:
```typescript
              if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                  const limit = maxSubmits < totalFrames ? maxSubmits : totalFrames;
                  let dispatches = limit - nextFrameToSubmit;
                  if (dispatches > 0) {
                    dispatches = Math.min(dispatches, freeWorkersHead);
                    for (let d = 0; d < dispatches; d++) {
                      freeWorkersHead--;
                      const w = freeWorkers[freeWorkersHead];
                      const n = nextFrameToSubmit;
                      nextFrameToSubmit++;
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                    }
                  }
                  if (nextFrameToSubmit === totalFrames) {
                    for (let j = 0; j < freeWorkersHead; j++) {
                      const w = freeWorkers[j];
                      workerThenables[w].resolve(-1);
                    }
                    freeWorkersHead = 0;
                }
              }
```
Swap their order. Move the entire `if (freeWorkersHead > 0)` block to be strictly **before** the `if (nextFrameToWrite < chunkEnd)` wait block.

### Step 2: Hoist Dispatch Block in Generic Writer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `else if (!aborted)` block, do the exact same swap. Move the `if (freeWorkersHead > 0)` dispatch block to execute strictly before the `if (nextFrameToWrite < chunkEnd)` wait block.

**Why**: Ensures maximum parallel saturation by keeping workers busy *while* the writer waits, rather than keeping workers idle.

## Variations
None.

## Canvas Smoke Test
Run a standard canvas benchmark to ensure the generic strategy multi-worker pipeline remains intact and faster.

## Correctness Check
Run FFmpeg tests to verify `frameBufferRing` indexing does not break frame order.
