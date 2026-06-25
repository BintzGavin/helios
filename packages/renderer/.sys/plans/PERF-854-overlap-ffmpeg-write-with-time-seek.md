---
id: PERF-854
slug: overlap-ffmpeg-write-with-time-seek
status: unclaimed
claimed_by: ""
created: 2024-06-25
completed: ""
result: ""
---

# PERF-854: Overlap FFmpeg stream write with Time Seek CDP await

## Focus Area
`CaptureLoop.ts` frame capture fast paths (both `hasProcessFn = true` and `!hasProcessFn`), specifically targeting the sequence of base64 writing, awaiting `timePromise`, and triggering `domBeginFrame()`.

## Background Research
Currently, in the single-worker `isDomStrategy` loop, the order of operations for non-final frames is:
1. Decode base64 to buffer chunk: `const written = pooled.buffer.write(buf, "base64"); const chunk = pooled.buffer.subarray(0, written);`
2. Await `timePromise` (network/IPC roundtrip): `if (timePromise) await timePromise;`
3. Send next frame CDP request: `nextCapturePromise = domBeginFrame!();`
4. Write chunk to FFmpeg and handle backpressure: `pendingBytes += written; const writeSuccessStr = stream.write(chunk, pooled.freeCb); if (!writeSuccessStr ...) await this.drainPromise;`

Because step 2 `await timePromise` occurs *before* step 4 `stream.write`, the CPU completely idles while waiting for Chromium to process the `Runtime.evaluate` command for the time seek. It does not hand the chunk to FFmpeg's stream until *after* Chromium finishes the seek.
If we swap these operations:
1. Decode base64 to buffer chunk
2. Write chunk to FFmpeg: `const writeSuccessStr = stream.write(chunk, pooled.freeCb);`
3. Await `timePromise`: `if (timePromise) await timePromise;`
4. Handle backpressure (if needed): `if (!writeSuccessStr) await this.drainPromise;`
5. Send next frame CDP request: `nextCapturePromise = domBeginFrame!();`

This allows Node.js to push the chunk to the FFmpeg process (and FFmpeg to start encoding it) *concurrently* while Node.js is waiting for Chromium to finish the time seek! This overlaps IPC/encoding with IPC/rendering.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The time seek CDP command blocks the main thread, delaying the transfer of the decoded frame to the FFmpeg process.

## Implementation Spec

### Step 1: Reorder operations in the single-worker `isDomStrategy` paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker loop fast path (`isDomStrategy == true` inner loops, e.g. around lines 276-311, 600-633, and any other similar blocks where `stream.write` happens after `await timePromise`), reorder the operations inside `if (i < totalFrames - 1) { ... }`.

Change from:
```typescript
const written = pooled.buffer.write(buf, "base64");
const chunk = pooled.buffer.subarray(0, written);

if (timePromise) await timePromise;
nextCapturePromise = domBeginFrame!();

pendingBytes += written;
const writeSuccessStr = stream.write(chunk, pooled.freeCb);

if (!writeSuccessStr && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```

To:
```typescript
const written = pooled.buffer.write(buf, "base64");
const chunk = pooled.buffer.subarray(0, written);

pendingBytes += written;
const writeSuccessStr = stream.write(chunk, pooled.freeCb);

if (timePromise) await timePromise;
nextCapturePromise = domBeginFrame!();

if (!writeSuccessStr && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```

Do this for all `if (i < totalFrames - 1)` branches in `isDomStrategy` loops where we wait for `timePromise` after getting the chunk.

**Why**: By triggering `stream.write` before `await timePromise`, the chunk is pushed to FFmpeg, which runs in a separate process. FFmpeg can begin encoding the frame while Node.js is waiting for Chromium to evaluate the `setTime` script. Additionally, if the stream returns `false` (backpressure), we wait for `timePromise` *before* we `await this.drainPromise`, potentially overlapping the backpressure delay with the time seek delay.

**Risk**: If `stream.write` throws synchronously, the loop would break before `timePromise` resolves, but this is handled by error listeners on the stream. No functional risk.

## Variations
Apply the same logic to the `buf` (binary buffer) paths if any exist where `stream.write` is delayed until after `await timePromise` in the single-worker loop.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode canvas` to ensure `canvas` mode is not broken.

## Correctness Check
Run the `dom` mode benchmark script to verify output is unchanged.

## Prior Art
- PERF-830: Overlapped Time Seek with Base64 Decode
- PERF-853: Re-applied the Base64 overlap
