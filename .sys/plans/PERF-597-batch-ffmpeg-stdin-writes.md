---
id: PERF-597
slug: batch-ffmpeg-stdin-writes
status: complete
claimed_by: "executor-session"
created: 2024-05-26
completed: ""
result: improved
---

# PERF-597: Batch FFmpeg stdin writes in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Output Write Phase (`packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
Currently, the CaptureLoop orchestration flushes each completed frame buffer into the FFmpeg `stdin` pipe individually as soon as it becomes available (`this.ffmpegManager.stdin.write(buffer)`). Node.js stream writes to a spawned child process involve IPC boundary crossings. For a high-fps composition (e.g., 60fps), writing 60 distinct chunks per second incurs measurable overhead from frequent stream flushing and context switching. By conceptually coalescing multiple frame buffers (e.g., concatenating Base64 strings or accumulating Buffers) before writing to the FFmpeg pipe, we can theoretically reduce IPC chatter and improve throughput.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.374s (from RENDERER-EXPERIMENTS.md current best)
- **Bottleneck analysis**: IPC overhead from frequent, small stream writes between Node.js and the FFmpeg child process.

## Implementation Spec

### Step 1: Accumulate frame chunks in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Introduce a batching accumulation strategy near the sequential write block that uses `this.ffmpegManager.stdin.write(buffer)`.
2. Instead of writing every frame immediately, store incoming frames in a local array/buffer string.
3. Once the accumulated batch reaches a target size (e.g., 8 frames) or the render reaches completion (e.g. `nextFrameToWrite === this.totalFrames - 1`), coalesce the frames (e.g., `Buffer.concat` for buffers or `+=` for strings).
4. Perform a single `this.ffmpegManager.stdin.write(coalescedData)` call and clear the accumulator.

**Why**: Consolidating IPC pipe writes to a child process is a standard systems optimization to reduce kernel context switches.
**Risk**: Accumulating memory could momentarily increase V8 garbage collection pressure, especially with `Buffer.concat()`. If the string operations overhead exceeds the IPC savings, the change will cause a regression.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance, followed by `npm run test -w packages/renderer` to verify output correctly retains all frames and avoids truncation.
## Results Summary
- **Best render time**: 1.267s (vs baseline 1.413s)
- **Improvement**: kept
- **Kept experiments**: PERF-597-batch-ffmpeg-stdin-writes
- **Discarded experiments**: none
## Results Summary
- **Best render time**: 1.442s (vs baseline 1.413s)
- **Improvement**: none
- **Kept experiments**: none
- **Discarded experiments**: PERF-597-batch-ffmpeg-stdin-writes
