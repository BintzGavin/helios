---
id: PERF-039
slug: evaluate-async-capture
status: unclaimed
claimed_by: ""
created: 2024-03-23
completed: ""
result: ""
---
# PERF-039: Concurrently Evaluate and Async Frame Capture Loop

## Focus Area
Frame Capture Loop & Concurrency Model

## Background Research
The `Renderer.ts` capture loop currently limits concurrent frame evaluation and screenshotting strictly based on a pipelining array of promises. Even though we queue `pool.length * 8` frames, we still rely on strict promise chain resolution before executing the underlying CDP command. Because `Runtime.evaluate` and `Page.captureScreenshot` commands are fundamentally queued asynchronously by Chrome CDP, if we instead issue all `worker.activePromise` continuations fully async inside a decoupled worker loop, and use an array or queue for the FFmpeg writer to pick up results asynchronously, we can allow each Chromium worker to operate independently of other workers' frame completion times, rather than stalling the entire Node.js `captureLoop` if one worker takes longer to return a buffer.

However, the previous experiment PERF-030 enforced worker-local sequential promise chaining because removing it broke correct chronological ordering or evaluation of `seek` and `capture`. To maintain sequential ordering per worker but maximize concurrency across workers, we can spawn a background async task (a while loop) *for each worker* that continuously pulls the next available frame index assigned to it, evaluates it, captures it, and resolves a corresponding promise in a shared `framePromises` array. The main thread then sequentially `await framePromises.shift()` and writes to FFmpeg.

## Benchmark Configuration
- **Composition URL**: `file://${process.cwd()}/examples/simple-animation/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 600x600, 30fps, 150 frames (5 seconds), JPEG intermediate format
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.324s (baseline PERF-030, currently measured ~32.4s).
- **Bottleneck analysis**: The frame capture loop operates as a single large `while` loop that pushes promises and then immediately `awaits` the oldest one, which can cause the pipeline refill to stall if the oldest frame is blocking, leaving other workers idle.

## Implementation Spec

### Step 1: Implement Worker-Specific Capture Loops
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Instead of a central `while (nextFrameToWrite < totalFrames)` loop that both submits tasks and writes to FFmpeg, decouple the submission into independent async worker loops.
Each worker runs an async function that processes frames assigned to it (e.g., `frameIndex % pool.length === workerIndex`). The worker awaits its own frame capture, then stores the resulting Buffer in a shared array or resolves a deferred Promise that the main loop is waiting on.
To prevent memory explosion, limit the total number of "in-flight" frames across all workers to `pool.length * 8`.

**Why**: This fully decouples the execution of individual workers. If Worker A is slow to capture frame 0, Worker B can still proceed to capture frame 1, 2, and 3, up to the pipeline depth limit. The main loop simply waits for frame N to be ready, writes it, and signals the workers that pipeline space has freed up.
**Risk**: Frame ordering must still be strictly preserved for FFmpeg. The synchronization between worker loops and the main writing loop could introduce complexity or race conditions if not carefully managed.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/render.ts` to ensure Canvas mode remains functional.

## Correctness Check
Run the DOM benchmark and verify that the output `out.mp4` contains visually correct frames of the simple animation and is not blank, distorted, or out of order.

## Prior Art
- PERF-030: Enforced worker-local sequential promise chaining for frame capture loop.
- PERF-029: Increased the active pipeline depth constraint.
