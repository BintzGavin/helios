---
id: PERF-689
slug: native-stream-buffering-single-worker
status: complete
claimed_by: "executor-session"
created: 2024-06-06
completed: ""
result: ""
---

# PERF-689: Native Stream Buffering in Single Worker Fast Path

## Focus Area
Single-worker fast path stream writes in `CaptureLoop.ts`. This targets the pipeline stall where Chromium waits idly for FFmpeg to drain a single frame.

## Background Research
In PERF-683, the single-worker fast path eliminated Actor Model overhead but made the render sequence strictly sequential: it waits for the `drain` event on `stdin` on almost every frame because a 1080p frame (~300KB) exceeds Node's default pipe `highWaterMark` (64KB). This causes `canWriteMore` to always be false, forcing a ping-pong block. PERF-688 attempted to fix this by overlapping the `await capturePromise` with `await previousWritePromise`, but V8 penalized the detached promise chain, causing a regression.
By leveraging Node.js's native `Writable` stream buffering, we can ignore `canWriteMore === false` until the `stdin.writableLength` exceeds a generous threshold (e.g., 16MB). This allows Node to batch multiple frames in memory and continuously feed FFmpeg without blocking the V8 hot loop, restoring the pipeline overlap between Chromium and FFmpeg without any async closure overhead.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/dom-benchmark.html
- **Render Settings**: 1080p, 60fps, 10s (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.18s
- **Bottleneck analysis**: The single-worker loop stalls Chromium while waiting for FFmpeg stream drainage.

## Implementation Spec

### Step 1: Increase Drain Wait Threshold
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `poolLen === 1` single-worker loop, modify the condition that creates `previousWritePromise`. Instead of creating it whenever `!canWriteMore`, only create it if the stream's internal buffer exceeds 16MB (16777216 bytes).

```typescript
<<<<<<< SEARCH
                    if (!canWriteMore) {
                        previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
                    }
=======
                    if (!canWriteMore && stdin.writableLength >= 16777216) {
                        previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
                    }
>>>>>>> REPLACE
```
**Why**: This allows the fast loop to burst frames into Node's memory up to 16MB before blocking to wait for FFmpeg. This perfectly overlaps Chromium rendering with FFmpeg encoding using native C++ streams instead of JavaScript Actor ring buffers.
**Risk**: Negligible. 16MB is extremely safe for memory overhead, and `stdin.writableLength` is a standard Node.js property.

## Variations
### Variation A: 32MB Threshold
If 16MB yields a small improvement, the Executor may try a larger threshold `33554432` to allow even deeper pipelining, ensuring Chromium is never blocked by brief FFmpeg CPU spikes.

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors break the Canvas path.

## Correctness Check
Run the DOM benchmark (`npx tsx scripts/benchmark-perf.ts`) and ensure output videos render correctly.

## Prior Art
- PERF-683: Introduced the single-worker fast path but made it strictly sequential.
- PERF-688: Attempted to pipeline this path using detached JS promises and regressed due to V8 microtask penalties. This plan achieves the same overlap natively.
