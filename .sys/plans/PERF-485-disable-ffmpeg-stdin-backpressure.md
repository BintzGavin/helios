---
id: PERF-485
slug: disable-ffmpeg-stdin-backpressure
status: unclaimed
claimed_by: ""
created: 2026-05-12
completed: ""
result: ""
---
# PERF-485: Disable FFmpeg Stdin Backpressure in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `run` method, specifically the FFmpeg `stdin.write` logic.

## Background Research
Currently, the `CaptureLoop` respects the `drain` event backpressure of `ffmpegManager.stdin` via `previousWritePromise`. When `stdin.write` returns `false`, the loop awaits a `Promise` that resolves when the `drain` event fires. This creates a synchronized coupling between the DOM capture workers (which fill the `frameBufferRing`) and the FFmpeg encoder (which consumes the pipe).
Because DOM capture is entirely CPU-bound in a headless environment, and WebP frame sizes are relatively small (~20-50KB per frame), a typical 10-second 60FPS render only generates ~12-30MB of intermediate data. Node.js heap memory can easily absorb this entire buffer. By removing the backpressure `await`, we allow the orchestrator loop to aggressively drain the `frameBufferRing` and queue all writes in Node's internal stream memory buffer. This fully decouples the capture worker pool from FFmpeg's encoding pace, eliminating micro-stalls caused by I/O context switches.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.130s (PERF-470)
- **Bottleneck analysis**: I/O backpressure stalls the orchestrator loop, propagating blocking delays to the `BrowserPool` workers.

## Implementation Spec

### Step 1: Remove backpressure `await` in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run` method's write loop, remove the backpressure await logic.
Change:
```typescript
            if (previousWritePromise) {
                await previousWritePromise;
            }

            const writeResult = this.writeToStdin(buffer, this.handleWriteError);
            previousWritePromise = writeResult ? writeResult : undefined;
```
to simply:
```typescript
            this.writeToStdin(buffer, this.handleWriteError);
```
And remove the `await previousWritePromise;` at the end of the `run` method (before `pool[0].strategy.finish()`).

**Why**: Bypassing backpressure allows `nextFrameToWrite` to advance as rapidly as workers can produce frames, pushing the buffering responsibility to Node.js's stream implementation. This maximizes parallel CPU utilization for DOM capture.
**Risk**: For extremely long compositions (e.g., hours of video), Node.js could run out of heap memory if FFmpeg is significantly slower than DOM capture. However, for our benchmarking and typical use cases, the memory overhead is negligible.

## Variations
- None.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure FFmpeg successfully encodes all frames from the memory-buffered pipe without truncation or corruption.