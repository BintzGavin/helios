---
id: PERF-123
slug: optimize-ffmpeg-stdin-pipe-writes
status: complete
claimed_by: "executor-session"
created: 2026-03-31
completed: "2026-03-31"
result: "no-improvement"
---
# PERF-123: Optimize FFmpeg stdin Pipeline Block Size

## Focus Area
The hot frame capture loop in `packages/renderer/src/Renderer.ts` and specifically how Buffer chunks are piped into FFmpeg via `ffmpegProcess.stdin.write`.

## Background Research
Currently, in the `captureLoop`, as soon as a frame Buffer is produced by the `DomStrategy`, it is immediately passed to `ffmpegProcess.stdin.write(buffer)`. Playwright screenshots or CDP `HeadlessExperimental.beginFrame` return base64 data, which gets converted to individual Buffers of a few hundred KB each (or larger depending on resolution).

Writing each frame immediately causes back-and-forth context switching between Node.js userland and the OS kernel for pipe IPC, which forces FFmpeg to awaken constantly for small chunks of data. In a highly pipelined multi-worker setup, Node.js waits to trigger `drain` events if the pipe fills up, managing stream backpressure at a granularity of single frames.

If we aggregate these buffers into larger chunks before invoking `stdin.write`, we reduce the number of system calls and pipe IPC overhead significantly. This allows Node.js to batch write data and FFmpeg to ingest larger segments, which should relieve CPU overhead in the `write()` function within the hot loop.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.66s
- **Bottleneck analysis**: IPC overhead from Node.js writing to FFmpeg's stdin pipe on every single frame limits throughput by introducing micro-stalls and frequent context switching.

## Implementation Spec

### Step 1: Implement chunked writes for FFmpeg stdin
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Instead of calling `ffmpegProcess.stdin.write(buffer)` for every single frame individually, maintain a temporary array of buffers (e.g., `const chunkQueue: Buffer[] = [];`) and a counter for the accumulated byte size.
Once the accumulated size exceeds a sensible threshold (e.g., 1MB = `1024 * 1024` bytes) or we reach the final frame (`i === totalFrames - 1`), use `Buffer.concat(chunkQueue)` to merge them and perform a single `stdin.write()` call.

*Example logic inside the while loop:*
```typescript
chunkQueue.push(buffer);
chunkSizeBytes += buffer.length;

if (chunkSizeBytes > 1024 * 1024 || i === totalFrames - 1) {
  const combinedBuffer = Buffer.concat(chunkQueue);
  const canWriteMore = ffmpegProcess.stdin.write(combinedBuffer, ...);
  // ... existing drain handling ...
  chunkQueue.length = 0;
  chunkSizeBytes = 0;
}
```

**Why**: Batching writes reduces the number of `write` system calls and the frequency of backpressure (`drain`) events, reducing V8 event loop blocking overhead during the hot pipeline execution.
**Risk**: Slightly higher transient memory usage right before the `concat` and `write`. However, dynamic memory is immediately released to GC.

## Correctness Check
Verify that the output video plays correctly and doesn't exhibit tearing or missing frames by using manual playback.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to make sure Canvas mode isn't negatively affected since both strategies share the FFmpeg encoding pipeline in `Renderer.ts`.

## Results Summary
- **Best render time**: 34.088s (vs baseline ~33.66s)
- **Improvement**: -1.27% (Regression)
- **Kept experiments**: None
- **Discarded experiments**: [Step 1: Implement chunked writes for FFmpeg stdin]
