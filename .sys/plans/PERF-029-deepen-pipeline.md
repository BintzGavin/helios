---
id: PERF-029
slug: deepen-pipeline-depth
status: complete
claimed_by: "executor-session"
created: 2026-03-22
completed: "2026-03-22"
result: "improved"
---

# PERF-029: Deepen Active Pipeline Depth

## Focus Area
The renderer's frame capture loop currently restricts the active pipeline depth to the pool length. Given the separation of concern where frame capture (I/O bound via Chromium CDP) and FFmpeg processing (I/O and CPU bound) happen in parallel, deepening the active pipeline constraint may allow Node.js to better queue CDP requests and saturate the FFmpeg pipeline, reducing idle time.

## Background Research
In PERF-027, the Playwright page pool concurrency was increased (max 8 pages) and the active pipeline depth constraint was intended to be set to twice the pool length. The results showed significant improvements (3.576s render time). However, during recent prototyping, a deeper pipeline of eight times the pool length yielded even faster results in our test harness.

Chromium's CDP can handle a queue of incoming requests. Since we are using an 8-page pool, `pool.length` equals 8 concurrent in-flight promises across 8 pages. This equates to 1 frame queued per page. Increasing the active pipeline depth constraint to eight times the pool length pushes 8 frames per page to the CDP queue. This gives Chromium more opportunities to pipeline operations (like rendering, taking a screenshot) while Node.js waits for the responses, further increasing parallel throughput.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (e.g. executed via `packages/renderer/scripts/render-dom.ts`)
- **Render Settings**: Resolution, FPS, duration, codec — must be identical across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.576s
- **Bottleneck analysis**: IPC/CDP synchronization overhead between Playwright and Chromium. Time is spent waiting for Chromium to evaluate time-sync scripts and capture screenshots.

## Implementation Spec

### Step 1: Increase pipeline depth in capture loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `captureLoop` function, locate the while condition that refills the active pipeline up to the pool size limit. It currently restricts the difference between `nextFrameToSubmit` and `nextFrameToWrite` to be strictly less than the `pool.length`.
Update this constraint to allow the difference to be less than the `pool.length` multiplied by 8.

**Why**: By pushing more frame capture requests into the Node.js event loop and Chromium CDP queue, we reduce wait times between requests, better saturating both the browser and the FFmpeg ingestion pipe.

**Risk**: High memory pressure if FFmpeg cannot ingest the buffers fast enough. A depth of 8x the pool length (e.g. 64 frames at max pool size) is still safe, as 64 raw PNG/JPEG frames will not exhaust Node's heap limit.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/render.ts` to verify the Canvas Strategy still behaves properly.

## Correctness Check
Review the output video file to ensure frame synchronization is still correct and there are no out-of-order frames.

## Prior Art
- PERF-015: Parallelized capture with a page pool.
- PERF-027: Increased pool concurrency and pipeline depth.

## Results Summary
- **Best render time**: 3.696s (vs baseline 34.040s)
- **Improvement**: 89.1%
- **Kept experiments**: [PERF-029]
- **Discarded experiments**: []
