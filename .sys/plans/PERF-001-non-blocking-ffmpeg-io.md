---
id: PERF-001
slug: non-blocking-ffmpeg-io
status: complete
claimed_by: "executor-session"
created: 2024-03-24
completed: "2024-03-24"
result: improved
---

# PERF-001: Non-blocking FFmpeg I/O & Backpressure Management

## Focus Area
The Frame Capture Loop (phase 4) in `packages/renderer/src/Renderer.ts` is strictly sequential per-frame. It awaits `timeDriver.setTime()`, then awaits `strategy.capture()`, and finally awaits the `ffmpegProcess.stdin.write(buffer)` callback via `await new Promise(...)`. This means the browser sits idle while FFmpeg receives and processes the buffer, wasting valuable pipeline concurrency.

## Background Research
Node.js streams implement a high-water mark backpressure system. When `stream.write(chunk)` returns `true`, the internal buffer is below the limit, and the caller can immediately queue more data without awaiting a callback. If it returns `false`, the buffer is full, and the caller must wait for the `drain` event before writing more. Currently, `Renderer.ts` forces a full pipeline stall by wrapping every `write()` in an `await new Promise(...)` that only resolves on the write callback.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/default-dom-test`
- **Render Settings**: 1920x1080, 30 FPS, 5 seconds, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: TBD
- **Bottleneck analysis**: The `captureLoop()` in `packages/renderer/src/Renderer.ts` uses `await new Promise(...)` for every frame write to `ffmpegProcess.stdin.write(buffer)`. This serializes browser capture and FFmpeg encode, rather than pipelining them.

## Implementation Spec

### Step 1: Remove sequential await on FFmpeg write
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Inside the `captureLoop()`, replace the `await new Promise(...)` block wrapping `ffmpegProcess.stdin.write(buffer)` with a backpressure-aware implementation. Call `ffmpegProcess.stdin.write(buffer, (err) => { if(err) throw err; })`. If it returns `true`, proceed immediately to the next frame without awaiting. If it returns `false`, await a new Promise that resolves on the `ffmpegProcess.stdin.once('drain', ...)` event. Make sure to still check `!ffmpegProcess.stdin.writable` before writing and reject if it is not writable.
**Why**: This allows the Playwright capture loop to run as fast as possible, queuing frames in Node's memory up to the high-water mark, while FFmpeg reads from the pipe concurrently.
**Risk**: If backpressure is not handled correctly, it could cause unbounded memory growth and a Node.js OOM crash.

### Step 2: Ensure final buffer write is also non-blocking
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Apply the same backpressure logic to the final buffer write (`ffmpegProcess.stdin.write(finalBuffer)`) after the `captureLoop` finishes, before `ffmpegProcess.stdin.end()` is called.
**Why**: Consistency across all writes to the stream.
**Risk**: Low.

## Variations

### Variation A: Tune High-Water Mark
If standard backpressure isn't aggressive enough, experiment with increasing the Node.js pipe high-water mark (or spawning FFmpeg with a larger pipe buffer if supported by the OS) to allow more frames to queue before blocking the browser loop.

## Canvas Smoke Test
Run standard Canvas smoke test. Ensure canvas rendering mode (which uses the same `Renderer.ts` loop) does not regress or hang.

## Correctness Check
Ensure all frames are encoded in chronological order, no frames are dropped, and the final video duration matches the requested total frames.

## Prior Art
- Node.js Stream Backpressure Guide: https://nodejs.org/en/docs/guides/backpressuring-in-streams/
## Results Summary
- **Best render time**: 53.379s (vs baseline 54.770s)
- **Improvement**: 2.5%
- **Kept experiments**: Removed sequential await on FFmpeg write.
- **Discarded experiments**: N/A
