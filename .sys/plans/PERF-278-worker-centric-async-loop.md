---
id: PERF-278
slug: worker-centric-async-loop
status: unclaimed
claimed_by: ""
created: 2026-04-14
completed: ""
result: ""
---

# PERF-278: Eliminate worker.activePromise Promise Chain Allocation

## Focus Area
The hot frame generation pipeline in `CaptureLoop.ts`. Specifically, eliminating the per-frame Promise allocation caused by `worker.activePromise.then(...)`.

## Background Research
In `CaptureLoop.ts`, the pipeline queues tasks using `worker.activePromise.then(executeCapture, executeCapture)` (lines 143-146). While `executeCapture` is a pre-allocated closure, the `.then()` method itself inherently allocates and returns a new `Promise` object in V8. At 60fps for a long video, this creates thousands of intermediate Promise objects that must be garbage collected, adding GC pressure and microtask overhead.
We can eliminate this by removing `activePromise` chaining and instead using a worker-centric async loop (Actor model) or by simply `await`ing the previous frame's completion synchronously within the main loop if `poolLen === 1` (since the environment is a CPU-only microVM, concurrent Playwright pages might not be faster than sequential execution).
If we implement a worker-centric `async` loop, each worker can continuously pull frame tasks from a shared state, `await`ing the capture directly instead of building a massive `.then()` chain.

## Benchmark Configuration
- **Composition URL**: `file://.../output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: `1280x720`, `30fps`, `3 seconds`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.143s
- **Bottleneck analysis**: Microtask and Promise object allocation overhead during pipeline scheduling inside the main loop of `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Replace Pipeline Scheduling with Worker Loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Instead of maintaining a `worker.activePromise` and chaining `.then()` in the main `while` loop (lines 130-148), implement a worker-centric `async` loop.
1. Create a shared queue or counter for frames to be rendered (`nextFrameToSubmit`).
2. Start an `async` loop for each worker in the pool. The loop continually fetches the next available frame index, awaits `timeDriver.setTime`, awaits `strategy.capture`, and places the result in a shared `framePromises` array (or ring buffer) as a resolved value or a lightweight deferred promise.
3. The main `while` loop simply `await`s the result for `nextFrameToWrite` from the shared buffer, which can be signaled via a lightweight event or a single Promise that gets reused/resolved by the workers.

**Why**: This completely eliminates the `Promise.then()` allocation per frame, as `async/await` in a continuous loop reuses the async context and only allocates when awaiting actual I/O (CDP calls), avoiding the intermediate Promise wrappers used for pipeline ordering.
**Risk**: May introduce complexity in coordinating backpressure and exact frame ordering.

### Step 2: Main Loop Coordination
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Use a simple array `const completedFrames = new Array(totalFrames)` and a signaling mechanism (e.g., a `notify()` callback) so the main loop can sequentially read from `completedFrames` and pipe to FFmpeg without allocating new Promises for scheduling.

## Variations
### Variation A: Sequential Await for Single Worker
If `this.pool.length === 1`, bypass complex queuing and simply `await executeCapture()` directly in the main loop, entirely removing `activePromise` and `.then()`.

## Canvas Smoke Test
Verify Canvas strategy remains unaffected and correctly renders.

## Correctness Check
Run the DOM benchmark and inspect the output video to verify visual correctness and frame ordering.
