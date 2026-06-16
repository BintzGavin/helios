---
id: PERF-781
slug: infinite-node-buffering
status: unclaimed
claimed_by: ""
created: 2024-06-16
completed: ""
result: ""
---

# PERF-781: Infinite Node.js Stream Buffering (No Drain Await)

## Focus Area
Frame Capture Loop (`CaptureLoop.ts`). This targets the synchronization bottleneck between Chromium's frame generation and FFmpeg's stream consumption on the single-worker fast path.

## Background Research
In PERF-689, we implemented native stream buffering by raising the drain await threshold to 16MB (`stdin.writableLength >= 16777216`). While this improved performance by overlapping pipeline stages, awaiting the `drainPromise` inside the hot loop still periodically stalls the Node.js event loop, preventing it from sending the next `beginFrame` command to Chromium. Given that a typical 10-second DOM benchmark (600 frames) using base64 WebP/JPEG intermediate formats will only consume ~60-150MB of RAM—well below Node.js's default ~1.4GB heap limit—we can bypass the backpressure mechanism entirely.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, 10s (600 frames), `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s (median)
- **Bottleneck analysis**: Occasional `await this.drainPromise` calls block the single-threaded Node.js event loop from issuing subsequent CDP IPC messages.

## Implementation Spec

### Step 1: Remove backpressure await in single-worker fast path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both branches of the single-worker hot loop (`if (hasProcessFn)` and `else`), locate the FFmpeg stdin write logic:
```typescript
if (stdin?.writable) {
    const canWriteMore = stdin.write(buffer as any);

    if (!canWriteMore && stdin.writableLength >= 16777216) {
        await this.drainPromise;
    }
}
```
Remove the `canWriteMore` assignment, the length check, and the `await this.drainPromise;` block. Change it to simply:
```typescript
if (stdin?.writable) {
    stdin.write(buffer as any);
}
```
**Why**: Decouples the capture speed from the FFmpeg processing speed. Chromium will render as fast as possible, and Node.js will buffer the raw output into RAM.
**Risk**: High memory consumption (OOM) for very long compositions or uncompressed formats (e.g., `png` / raw pixels), though acceptable within the constraints of short benchmark clips.

## Correctness Check
Verify that the final output `.mp4` file accurately captures all 600 frames without truncation or corruption. Ensure FFmpeg is cleanly finalized after the loop via the existing `drainPromise` await in the orchestration teardown.

## Canvas Smoke Test
Ensure that the canvas capture pathway is not broken by changes.
