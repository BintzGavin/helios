---
id: PERF-013
slug: concurrent-capture-encode
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-013: Concurrent Capture and Encode

## Context & Goal
Currently, the frame capture `for` loop in `packages/renderer/src/Renderer.ts` is strictly sequential per frame: it advances virtual time (`await this.timeDriver.setTime`), waits for the frame capture (`await this.strategy.capture`), and then writes the buffer to the FFmpeg `stdin` pipe (`ffmpegProcess.stdin.write`), waiting for the `drain` event if `canWriteMore` is false, before moving to the next frame. Because capturing the frame from Playwright involves IPC and image decoding inside the Chromium process, the Node.js process sits idle waiting for the frame, and Chromium sits idle while Node writes to FFmpeg.
By decoupling the capture of frame `N+1` from the piping/encoding of frame `N`, we can parallelize the Chromium capture workload and the Node/FFmpeg I/O workload.

## File Inventory
- `packages/renderer/src/Renderer.ts`

## Implementation Spec

### Step 1: Implement Pipelining in Frame Capture Loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the frame capture `for` loop, introduce a variable to hold the promise of the *previous* frame's FFmpeg write operation (e.g., `let previousWritePromise = Promise.resolve();`).
Instead of `await`ing the FFmpeg `stdin.write` and potential `drain` event sequentially before advancing to the next frame:
1. Await `previousWritePromise`
2. Advance virtual time and capture the current frame (`await this.timeDriver.setTime`, `await this.strategy.capture`)
3. Initiate the write for the current frame and assign its completion (including any `drain` event waiting) to `previousWritePromise` without awaiting it immediately.
4. After the `for` loop, `await previousWritePromise` to ensure the final frame's write completes.

**Why**: This allows the Playwright frame capture (`this.strategy.capture`) for frame `N` to happen concurrently with the FFmpeg writing and backpressure handling for frame `N-1`.
**Risk**: If FFmpeg ingestion is slower than Playwright capture, we might buffer one extra frame in memory. This is negligible. However, if backpressure isn't handled correctly, we could encounter unhandled rejections.

## Test Plan
1. Execute `npm run test` inside the `packages/renderer` directory to ensure Canvas mode still works correctly, as `Renderer.ts` is shared.
2. Verify that all frames are written in the correct order and no frames are dropped.
