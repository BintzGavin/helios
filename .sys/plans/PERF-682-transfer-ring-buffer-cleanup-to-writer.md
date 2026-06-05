---
id: PERF-682
slug: transfer-ring-buffer-cleanup-to-writer
status: complete
result: discard
claimed_by: "executor-session"
created: 2024-06-05
completed: ""
result: ""
---

# PERF-682: Transfer Ring Buffer State Cleanup to Writer Loop

## Focus Area
DOM Rendering Pipeline - Actor model ring buffer state management in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently, the multi-worker actor model clears the ring buffer slots (`frameReadyRing[ringIndex] = 0; frameBufferRing[ringIndex] = null;`) inside the worker allocation logic (`checkState` and `runWorker`). Because of the ring buffer design with strict backpressure (`nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth`), it is guaranteed that the worker will never overwrite a slot before the writer has consumed it.
By moving the cleanup logic out of the worker assignment branches and placing it directly into the synchronous writer loop immediately after the frame is read, we:
1. Eliminate redundant array property resets in the hot worker allocation branches.
2. Centralize ring buffer consumption and cleanup in the single synchronous writer loop, allowing better cache locality and V8 compiler optimization.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html` (via standard run-all benchmarks)
- **Render Settings**: 600 frames, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.127s (from PERF-678)
- **Bottleneck analysis**: Overhead of unnecessary array property assignments in the `runWorker` and `checkState` microtask paths.

## Implementation Spec

### Step 1: Move cleanup to the writer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `frameReadyRing[ringIndex] = 0;` and `frameBufferRing[ringIndex] = null;` from `checkState`.
2. Remove `frameReadyRing[ringIndex] = 0;` and `frameBufferRing[ringIndex] = null;` from `runWorker`'s task assignment branch.
3. Add `frameReadyRing[ringIndex] = 0;` and `frameBufferRing[ringIndex] = null;` to the writer loop immediately after retrieving the buffer `const buffer = frameBufferRing[ringIndex]!;`.

**Why**: Simplifies the worker hot path, decreases the total number of bytecode instructions (from 4 assignment sites down to 2), and groups memory read/clear operations into the same synchronous cache line cycle in the writer.
**Risk**: Low. Backpressure logic guarantees a slot is always processed before it can be re-allocated.

## Canvas Smoke Test
Run `npm run test:renderer` to ensure `CaptureLoop` functions correctly under all strategies.

## Correctness Check
Run the DOM render benchmark and confirm complete output.

## Result
Discarded. The performance regression was substantial (median ~2.40s vs baseline ~2.127s). The assignment overhead in the tight inner writer loop actually cost more time than leaving it distributed within the worker paths.
