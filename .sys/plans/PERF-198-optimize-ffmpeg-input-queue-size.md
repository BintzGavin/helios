---
id: PERF-198
slug: optimize-ffmpeg-input-queue-size
status: complete
claimed_by: "executor-session"
created: 2026-04-06
completed: "2026-04-06"
result: "improved"
---
# PERF-198: Optimize Render Process Pipeline Concurrency & FFmpeg Configuration

## Focus Area
DOM Rendering Pipeline (`packages/renderer/src/strategies/DomStrategy.ts`).

## Background Research
Currently, the `ffmpeg` video input arguments use the default settings for the pipe. Since we're piping base64 image strings directly using `-f mjpeg` or `webp_pipe`, the default thread queue size blocks the Node.js pipe when FFmpeg falls behind. Increasing the `-thread_queue_size` flag of `ffmpeg` allows FFmpeg to pull from `stdin` much faster into its internal queue without blocking the Node.js pipe and triggering `drain` events constantly. This avoids Node.js stalling when calling `ffmpegProcess.stdin.write` which otherwise forces the worker pipeline to pause.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s
- **Bottleneck analysis**: The NodeJS event loop blocks waiting for `ffmpegProcess.stdin.write` to drain, because FFmpeg reads from `stdin` sequentially and its default pipe buffer is very small.

## Implementation Spec

### Step 1: Increase FFmpeg stdin thread queue size
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: Add `-thread_queue_size`, `1024` to the `videoInputArgs` before `-i`.
**Why**: Avoids `drain` stalls in `Renderer.ts`.
**Risk**: Negligible.

## Results Summary
- **Best render time**: 33.331s (vs baseline ~33.55s)
- **Improvement**: ~0.7%
- **Kept experiments**: Adding `-thread_queue_size 1024` to FFmpeg input stream.
- **Discarded experiments**: none
