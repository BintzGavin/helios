---
id: PERF-525
slug: reduce-worker-wait
status: complete
claimed_by: "Jules"
created: 2024-05-30
completed: "2024-05-31"
result: "discard"
---

# PERF-525: Reduce Worker Wait Overhead

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `runWorker` execution context and synchronization.

## Background Research
Currently, workers wait for a free slot in the ring buffer using an allocated Promise:
`i = await new Promise<number>(workerBlockedExecutors[workerIndex]);`
This creates a new Promise object per blocked frame. Under high load or when backpressure micro-stalls occur, this overhead contributes to V8 garbage collection pressure and delays loop resumption.
We can optimize this. If we use a shared `workerWaitPromise` (a single `Promise<void>`), we can have all blocked workers `await` it. When `checkState` finds slots, it replaces the `workerWaitPromise` and resolves the old one. This uses 1 Promise for *all* workers instead of 1 Promise *per* worker per block. When the promise resolves, the workers wake up, check `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth`, and if true, they claim a frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.071s
- **Bottleneck analysis**: Microtask queue allocation and executor overhead inside the high-frequency CaptureLoop worker coordination logic.

## Implementation Spec

### Step 1: Optimize Promise-based Wait
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the implementation of the worker wait condition inside `runWorker` to await a single shared Promise (`workerWaitPromise`) that is resolved by `checkState` when backpressure is relieved, rather than individual Promises. The workers will wake up and loop back to the condition check.
**Why**: Avoids allocating individual Promises and managing an explicit free worker stack array.
**Risk**: Potential "thundering herd" if multiple workers wake up and contend, but since the pool length is small (e.g., 3-8), the atomic `nextFrameToSubmit++` inside a single JavaScript thread prevents race conditions naturally.

## Canvas Smoke Test
Run canvas benchmarks (`npm test -w packages/renderer`) to ensure no regressions in basic ring buffer logic.

## Correctness Check
Run the DOM benchmark and inspect `output.mp4` to verify that all 600 frames were correctly ordered and written without drops.
