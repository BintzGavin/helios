---
id: PERF-930
slug: hoist-writer-dispatch-above-wait
status: unclaimed
claimed_by: ""
created: 2024-07-06
completed: ""
result: ""
---
# PERF-930: Hoist Worker Dispatch Above Writer Wait Block

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
`if (nextFrameToWrite < chunkEnd) { ... while (frameBufferRing[ringIndex] === null && !aborted) { await writerWaiterPromise; } ... }`
And the dispatch block immediately following it:
`if (freeWorkersHead > 0) { ... }`
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
