---
id: PERF-074
slug: events-once
status: unclaimed
claimed_by: ""
created: 2024-03-27
completed: ""
result: ""
---

**PERF-074: Optimize FFmpeg Backpressure Handling using events.once**

**Focus Area**
The central frame capture loop in `packages/renderer/src/Renderer.ts` creates significant V8 Garbage Collection pressure when writing frames to the `ffmpegProcess.stdin`. Because DOM capture is bursty, the FFmpeg input pipe fills up quickly, causing `canWriteMore` to return `false` on almost every frame. Currently, the `Renderer` responds by allocating a brand-new `Promise` and attaching three new event listeners (`drain`, `error`, `close`) to the stream for *every single frame*. This overhead compounds over thousands of frames.

**Background Research**
Every time a Node.js stream fills its internal buffer, `write()` returns `false`, signaling backpressure. The canonical way to wait is listening for the `drain` event. However, creating new anonymous functions and promises for every single frame is an anti-pattern in hot loops. By utilizing `events.once(ffmpegProcess.stdin, 'drain')`, we can avoid creating closures. `events.once` resolves with an array of arguments, but we just want to await it. Alternatively, since the outer `Promise.all([captureLoop(), ffmpegExitPromise])` already catches errors/close from the ffmpeg process, we just need to wait for `drain`. In fact, waiting for `events.once(ffmpegProcess.stdin, 'drain')` is natively optimized for exactly this.

**Benchmark Configuration**
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1280x720, 30 FPS, libx264, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

**Baseline**
- **Current estimated render time**: 33.840s (PERF-071)
- **Bottleneck analysis**: Micro-allocations in the hot loop (e.g., `new Promise()`, `onDrain`, `onError`, `onClose` closures) inside the `if (!canWriteMore)` block.

**Implementation Spec**

**Step 1: Optimize FFmpeg drain handling**
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
   - Add the import for `once` from the built-in `events` module at the top of the file.
   - In `captureLoop` inside the `if (!canWriteMore)` block, replace the entire inline `new Promise` allocation and its manual event listener attachment/detachment (`onDrain`, `onError`, `onClose`) with the optimized `once` utility waiting for the `drain` event.
   - Also locate the identical final buffer write check outside the loop and replace its inline promise allocation in the exact same manner.
**Why**: Avoids creating multiple garbage-collected closures per frame, speeding up the Node event loop and reducing memory churn.
**Risk**: Potential unhandled promise rejections if the stream errors out before draining, but the fallback `error` or `close` handlers in `ffmpegExitPromise` still correctly catch and abort the render because `captureLoop` and `ffmpegExitPromise` run concurrently in `Promise.all`.

**Correctness Check**
Run the DOM benchmark and verification tests to ensure the render still completes without hanging on `drain` and produces valid video files.

**Prior Art**
- PERF-071 focused on GC offloading for Playwright IPC and WAAPI allocations.
