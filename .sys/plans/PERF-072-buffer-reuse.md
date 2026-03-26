---
id: PERF-072
slug: buffer-reuse
status: unclaimed
claimed_by: ""
created: 2024-03-27
completed: ""
result: ""
---

# PERF-072: Optimize FFmpeg Backpressure GC

## Focus Area
The central frame capture loop in `packages/renderer/src/Renderer.ts` creates significant V8 Garbage Collection pressure when writing frames to the `ffmpegProcess.stdin`. Because DOM capture is bursty, the FFmpeg input pipe fills up quickly, causing `canWriteMore` to return `false` on almost every frame. Currently, the `Renderer` responds by allocating a brand-new `Promise` and attaching three new event listeners (`drain`, `error`, `close`) to the stream for *every single frame*. This overhead compounds over thousands of frames.

## Background Research
Every time a Node.js stream fills its internal buffer, `write()` returns `false`, signaling backpressure. The canonical way to wait is listening for the `drain` event. However, creating new anonymous functions and promises for every single frame is an anti-pattern in hot loops. By caching a single persistent `drain` listener or utilizing `events.once()`, we can eliminate the instantiation of thousands of closures and promises, reducing GC micro-stalls.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1280x720, 30 FPS, libx264, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 33.840s (PERF-071)
- **Bottleneck analysis**: Micro-allocations in the hot loop (e.g., `new Promise()`, `onDrain`, `onError`, `onClose` closures) inside the `if (!canWriteMore)` block.

## Implementation Spec

### Step 1: Optimize FFmpeg drain handling
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Inside the `captureLoop` where `if (!canWriteMore)` is checked, refactor the `previousWritePromise` assignment. Instead of a `new Promise` that manually attaches/detaches closures (`onDrain`, `onError`, `onClose`), utilize the built-in `events.once(ffmpegProcess.stdin, 'drain')` or implement a persistent class-level deferred promise. The `events.once` utility is highly optimized in Node.js for exactly this use case.
**Why**: Avoids creating multiple garbage-collected closures per frame, speeding up the Node event loop and reducing memory churn.
**Risk**: Potential unhandled promise rejections if the stream errors out before draining. Ensure the fallback `error` or `close` handlers in `ffmpegExitPromise` still correctly catch and abort the render.

## Correctness Check
Run the DOM benchmark and verification tests to ensure the render still completes without hanging on `drain` and produces valid video files.

## Prior Art
- PERF-071 focused on GC offloading for Playwright IPC and WAAPI allocations.
- PERF-043 optimized array allocations in the same loop.
