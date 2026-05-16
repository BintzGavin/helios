---
id: PERF-528
slug: hot-loop-micro-optimizations
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-528: Hot Loop Micro-Optimizations

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - Orchestrator loop Base64 decoding.
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` invocation depth.

## Background Research
Currently, the `DomStrategy` returns a Base64-encoded string representing the JPEG frame. This string is stored directly in `frameBufferRing` by the worker in `CaptureLoop.ts`. Later, the main orchestrator loop extracts the string and passes it to `ffmpegManager.stdin.write(buffer, 'base64')` in `writeToStdin`, which triggers a synchronous `Buffer.from` allocation on the main thread inside the orchestrator's tight `while` loop.
By moving `Buffer.from(buffer, 'base64')` out of the orchestrator loop and into the `runWorker` closure exactly when the frame is received from CDP, we achieve two things:
1. **L1 Cache Locality**: The Base64 string is decoded while it is still hot in the CPU cache immediately after being parsed from the Playwright IPC message.
2. **Orchestrator Unblocking**: The tight `while (nextFrameToWrite < this.totalFrames)` loop in the orchestrator is stripped of heavy decoding logic, allowing it to evaluate backpressure state and assign new frames to waiting workers much faster.

Additionally, `CdpTimeDriver.ts` wraps the core `setTime` logic in an unnecessary internal `runSetTime` method, and routes stability checks through an external `handleStabilityCheckResponse` method. Flattening these into the single `setTime` method avoids two unnecessary function frame allocations per captured frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.793s - 16.306s
- **Bottleneck analysis**: Microtask queue allocation, L1 cache misses during deferred string-to-buffer conversion, and function frame depth in the hot loop.

## Implementation Spec

### Step 1: Eager Base64 Decoding for Cache Locality
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `runWorker`, immediately decode the base64 string to a Buffer before storing it in the ring buffer.
<<<<<<< SEARCH
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
=======
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                let buffer = await strategy.capture(page, time);
                if (typeof buffer === 'string') {
                    buffer = Buffer.from(buffer, 'base64');
                }
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
>>>>>>> REPLACE
**Why**: Takes advantage of L1 CPU cache locality while the IPC message string is fresh, and offloads decoding from the central orchestrator loop.
**Risk**: Negligible. Buffer allocation is required regardless.

### Step 2: Inline CdpTimeDriver methods
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Merge `runSetTime` directly into `async setTime(page: Page, timeInSeconds: number): Promise<void>`. Inline `handleStabilityCheckResponse` inside `setTime`.
**Why**: Reduces call stack depth and closure overhead on the hot path.

## Correctness Check
Run the DOM benchmark and verify output video is correctly encoded. Ensure tests pass.
