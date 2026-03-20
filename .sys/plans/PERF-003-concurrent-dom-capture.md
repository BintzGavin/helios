---
id: PERF-003
slug: concurrent-dom-capture
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-003: Concurrent DOM Capture Pool

## Focus Area
The Frame Capture Loop (phase 4) in `packages/renderer/src/Renderer.ts`. We are targeting the sequential nature of `captureLoop`, which processes one frame at a time, severely limiting CPU utilization during DOM rendering.

## Background Research
Chromium uses a multi-process architecture. When capturing frames sequentially from a single page, the rendering and PNG encoding (even via CDP) happen on a single renderer process, leaving other CPU cores idle. Node.js is also mostly idle waiting for the IPC response. By opening multiple `Page` instances (or `BrowserContext`s) pointing to the same composition URL and partitioning the frame range across them, we can capture frames concurrently. The microVM environment is CPU-only but multi-core, making it an ideal candidate for heavy parallelization of the rendering pipeline.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition (e.g., `http://localhost:3000/default-dom-test`)
- **Render Settings**: 1920x1080, 30 FPS, 5 seconds, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: TBD (dependent on machine, see PERF-001/PERF-002 results for baseline context)
- **Bottleneck analysis**: The `captureLoop` in `packages/renderer/src/Renderer.ts` is strictly sequential (`for (let i = 0; i < totalFrames; i++) { await capture() }`). This bounds the entire render process to the single-thread performance of the Chromium renderer process handling that page.

## Implementation Spec

### Step 1: Implement Page Pool Initialization
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Instead of creating a single `page`, create an array of `N` pages (e.g., `const CONCURRENCY = require('os').cpus().length || 4;`).
Load the composition URL and run `timeDriver.init` and `strategy.prepare` on all of them in parallel via `Promise.all`.
**Why**: We need multiple active instances of the composition to render different points in time simultaneously.
**Risk**: Higher memory usage. The microVM has limited memory; if `CONCURRENCY` is too high, it may cause OOM errors. We should start with a conservative default (e.g., 2 or 4) or make it configurable.

### Step 2: Implement Concurrent Capture Loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Refactor the `captureLoop`. Instead of a single `for` loop, create a task queue of frame indices (`0` to `totalFrames - 1`).
Spawn `CONCURRENCY` async workers. Each worker grabs the next available frame index, uses its assigned `page` to set the time (`await this.timeDriver.setTime(page, timeInSeconds)`), and captures the buffer.
**Why**: This distributes the work across multiple Chromium renderer processes.
**Risk**: High complexity.

### Step 3: Implement Frame Reordering/Buffering for FFmpeg
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
FFmpeg requires frames to be written to `stdin` in strict sequential order. Because our workers will finish frames out of order, we must buffer them in Node.js memory.
Create a `Map<number, Buffer>` (or an array) to store completed frames.
Maintain a `nextExpectedFrameIndex` pointer (starting at 0).
When any worker finishes a frame, store it. Then, while the `nextExpectedFrameIndex` is available in the buffer, write it to FFmpeg, delete it from the buffer, and increment the pointer. Ensure backpressure is still respected (as implemented in PERF-001).
**Why**: This bridges the gap between concurrent, out-of-order capture and sequential FFmpeg encoding.
**Risk**: Memory leaks if frames back up because one slow frame prevents subsequent frames from being written, causing the buffer to grow. A high-water mark for the frame pool may be necessary (e.g., pause workers if the buffer holds > 30 frames).

## Variations

### Variation A: Distributed Rendering Chunks
Instead of buffering in memory, use the existing chunking logic (if available) or spawn multiple FFmpeg instances to render discrete segments of the video simultaneously, then concatenate them at the end. This is safer for memory but incurs FFmpeg startup and concatenation overhead.

## Canvas Smoke Test
Run a standard Canvas smoke test. Ensure the concurrency logic does not break the Canvas rendering path, or explicitly restrict this optimization to `mode: 'dom'`.

## Correctness Check
1. Output video must have correctly ordered frames (no stuttering or backwards jumps).
2. Ensure animations, video, and audio sync are still correct when time jumps non-linearly between frames on a single page instance.

## Prior Art
- Multi-processing in standard web scraping (Puppeteer/Playwright Cluster).
- Video encoding tools chunking and parallelizing transcodes.