---
id: PERF-435
slug: optimize-ffmpeg-thread-queue
status: complete
claimed_by: "executor-session"
created: 2024-05-04
completed: "2024-05-04"
result: "no-improvement"
---

# PERF-435: Optimize FFmpeg Pipe thread_queue_size

## Context & Goal
Currently, the DOM renderer pipes base64-decoded images or binary buffers into FFmpeg via stdin. In `DomStrategy.ts`, the `-thread_queue_size` for the stdin pipe (`-i -`) is set to `512`.
When the pipeline executes quickly, Node.js streams frames into FFmpeg. If FFmpeg's video encoder (`libx264`) takes slightly longer to encode a specific complex frame, the queue fills up. Once the `512` frame limit is hit, FFmpeg stops reading from stdin, causing OS-level backpressure. Node.js `stdin.write` will return `false`, triggering our `CaptureLoop.ts` `drain` listener mechanism, which suspends the hot loop until FFmpeg catches up.
By significantly increasing `-thread_queue_size` to `4096` (or even `8192`), we give FFmpeg a much larger memory buffer for incoming frames. This allows the Node.js V8 event loop to process CDP commands and capture frames at maximum IPC throughput without artificially pausing to wait for the encoder to catch up. Memory is not a severe constraint in the Jules microVM for simple PNG frames, but CPU stalling is.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Architecture
- **Data Flow**: The data flow from Node.js (via `CaptureLoop.ts` writing to `ffmpegProcess.stdin`) remains exactly the same. The only change is configuring FFmpeg to allocate a larger buffer queue for its input stream reading thread.
- **Concurrency**: By increasing the queue size, the producer thread (Node.js) is unblocked for longer bursts before hitting backpressure, while the consumer thread (FFmpeg's encoder) pulls frames from this larger queue asynchronously.

### Pseudo-Code
Modify `getFFmpegArgs` to output the new value:
```typescript
    const videoInputArgs = [
      '-f', inputFormat,
      '-framerate', `${options.fps}`,
      '-thread_queue_size', '4096', // Changed from '512'
      '-i', '-',
    ];
```

### Public API Changes
None.

### Dependencies
None.

## Test Plan
- Run the DOM Correctness check: `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts`.
- Run the performance benchmark to record metrics: `npm run build -w packages/core && npm run build -w packages/renderer && npm run build:examples && cd packages/renderer && npx tsx scripts/benchmark-test.js`.

## Results Summary
- **Best render time**: 32.533s (vs baseline 32.682s)
- **Improvement**: ~0.4%
- **Kept experiments**: None
- **Discarded experiments**: thread_queue_size 4096 (discarded due to negligible performance improvement, confirming default queue is sufficient)
