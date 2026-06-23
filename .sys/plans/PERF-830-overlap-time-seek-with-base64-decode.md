---
id: PERF-830
slug: overlap-time-seek-with-base64-decode
status: unclaimed
claimed_by: ""
created: 2026-06-23
completed: ""
result: ""
---

# PERF-830: Overlap Time Seek with Base64 Decode in DomStrategy Loop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast path (single-worker loop).

## Background Research
In the current `CaptureLoop.ts` single-worker loop, the order of operations per frame is strictly sequential:
1. `await nextCapturePromise` (wait for Chromium to return the screenshot)
2. `timePromise = timeDriver.setTime(...)` (send CDP `Runtime.evaluate` to advance virtual time)
3. `await timePromise` (wait for Chromium to finish evaluating the time update)
4. `nextCapturePromise = domBeginFrame!()` (send CDP `HeadlessExperimental.beginFrame` to capture next frame)
5. Base64 decode string to buffer (CPU-bound)
6. Write to FFmpeg stdin

This ordering means the Node.js event loop blocks on `await timePromise` *before* it begins decoding the Base64 frame from the previous capture. By rearranging the operations, we can overlap the CPU-bound Base64 decoding with the I/O-bound `timePromise` (the CDP roundtrip to Chromium).

Optimized ordering:
1. `await nextCapturePromise`
2. `timePromise = timeDriver.setTime(...)` (Start CDP request to advance time)
3. Base64 decode string to buffer (CPU decode while CDP request is inflight to Chromium)
4. `await timePromise` (Ensure time is updated before triggering capture)
5. `nextCapturePromise = domBeginFrame!()` (Trigger next capture)
6. Write to FFmpeg stdin

This allows Chromium's V8 to evaluate `seekTo()` while Node's V8 is decoding the Base64 screenshot, reducing the overall time per frame.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Sequential execution of I/O (time seek) and CPU (Base64 decoding) in the main loop.

## Implementation Spec

### Step 1: Reorder operations in the single-worker string path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `if (isString)` branch (around line 527), modify the loop body to overlap `setTime` with decoding:

```typescript
// Current:
const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
if (timePromise) await timePromise;
if (isDomStrategy) {
    nextCapturePromise = domBeginFrame!();
} else {
    nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
}

const maxBytes = ((buf as string).length * 3) >>> 2;
let pooled = freePool.pop();
if (!pooled || pooled.buffer.length < maxBytes) {
    pooled = new PooledBuffer(maxBytes + (maxBytes >> 1), freePool);
}
const written = pooled.buffer.write(buf as string, 'base64');
const chunk = pooled.buffer.subarray(0, written);
pendingBytes += written;
const writeSuccessStr = stream.write(chunk, pooled.freeCb);

// Change to:
const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);

const maxBytes = ((buf as string).length * 3) >>> 2;
let pooled = freePool.pop();
if (!pooled || pooled.buffer.length < maxBytes) {
    pooled = new PooledBuffer(maxBytes + (maxBytes >> 1), freePool);
}
const written = pooled.buffer.write(buf as string, 'base64');
const chunk = pooled.buffer.subarray(0, written);

if (timePromise) await timePromise;

if (isDomStrategy) {
    nextCapturePromise = domBeginFrame!();
} else {
    nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
}

pendingBytes += written;
const writeSuccessStr = stream.write(chunk, pooled.freeCb);
```

**Why**: This initiates the CDP `Runtime.evaluate` command to advance virtual time, and while waiting for Chromium to process it and respond, Node.js performs the expensive CPU task of decoding the Base64 image chunk.
**Risk**: If decoding takes much less time than the CDP roundtrip, the improvement might be small, but it cannot regress performance.

## Variations
Apply the same overlap pattern to the multi-worker path if `timeDriver.setTime` is present in the hot loop there (it isn't, the multi-worker path assigns time synchronously before capture). Apply to the buffer path as well, though the buffer path has no decoding CPU work to overlap.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode canvas` to ensure `canvas` mode is not broken.

## Correctness Check
Run the `dom` mode benchmark script to verify output is unchanged.

## Prior Art
- PERF-717: Overlap time and drain promise.
