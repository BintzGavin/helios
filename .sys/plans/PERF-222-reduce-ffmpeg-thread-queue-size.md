---
id: PERF-222
slug: reduce-ffmpeg-thread-queue-size
status: complete
claimed_by: "executor-session"
created: 2024-06-03
completed: 2024-06-03
result: ""
---

# PERF-222: Reduce FFmpeg Thread Queue Size

## Focus Area
DOM Rendering Pipeline - FFmpeg Input Stream Synchronization in `DomStrategy.ts`.

## Background Research
Currently, the FFmpeg input video arguments (`videoInputArgs`) use `-thread_queue_size` set to `1024`. This was increased in PERF-198 to unblock the Node.js event loop while writing frames. However, in our CPU-only SwiftShader microVM environment, excessively large thread queues can lead to increased memory overhead and context switching costs within FFmpeg, potentially delaying the encoder. Reducing the queue size to `512` may find a better balance: it remains large enough to prevent Node.js from blocking on `stdin.write()`, while tightening the pipeline latency and reducing FFmpeg's internal buffer management overhead.

## Baseline
- **Current estimated render time**: 32.716s
- **Bottleneck analysis**: The Playwright/Chromium CDP frame capture and FFmpeg encode phases are CPU-bound. Tuning IPC buffering and memory overhead between Node.js and FFmpeg can yield slight improvements.

## Implementation Spec

### Step 1: Reduce `-thread_queue_size` to 512
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In the `getFFmpegArgs` method, modify the `videoInputArgs` array to set `'-thread_queue_size', '512'` instead of `'1024'`.
**Why**: A tighter queue size reduces memory overhead and buffer latency inside FFmpeg, potentially speeding up encoding while still being large enough to prevent Node.js write blocking.
**Risk**: If the queue is too small, Node.js may block on `stdin.write()` again, causing the render time to regress back to the pre-PERF-198 baseline (~33.5s).

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`.

## Correctness Check
Run the DOM render tests to ensure no visual regressions break tests.
