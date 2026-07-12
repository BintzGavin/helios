---
id: PERF-974
slug: hoist-dombeginframe-single-worker-chunked-loop
status: complete
claimed_by: "perf-974-executor"
created: 2024-07-12
completed: "2026-07-12"
result: "kept"
---

# PERF-974: Hoist domBeginFrame before Base64 Decode in Single-Worker Loop

## Focus Area
The single-worker DOM strategy chunked loop in `packages/renderer/src/core/CaptureLoop.ts` when `hasProcessFn` is true (around lines 260-330).

## Background Research
PERF-960 and PERF-878 successfully optimized the single-worker DOM loops by overlapping CPU-bound operations with Chromium rendering. By invoking `domBeginFrame!()` to dispatch the capture command for frame N+1 *before* doing synchronous operations on frame N, Chromium can generate pixels concurrently with Node's CPU work.

In the `hasProcessFn = true` path, the chunk loop currently reads:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    const data = rawResult.screenshotData;
                    let buf: Buffer;
                    if (data || !domLastFrameBuffer) {
                      if (data) domLastFrameData = data;
                      buf = Buffer.from(domLastFrameData as string, "base64");
                      domLastFrameBuffer = buf;
                    } else {
                      buf = domLastFrameBuffer;
                    }

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```

Here, `Buffer.from()` (CPU-bound decoding) is executed *before* `timeDriver.setTime()` and `domBeginFrame!()`. This means the Node.js event loop blocks on string decoding for several milliseconds while the browser sits idle. We can hoist the `timeDriver.setTime()` and `domBeginFrame!()` calls above the `Buffer.from()` logic.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The browser sits idle while Node.js performs Base64 string decoding on the main thread, resulting in sequential execution of inherently parallel tasks.

## Implementation Spec

### Step 1: Hoist `domBeginFrame` in Chunked Loop (`hasProcessFn = true`)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `if (hasProcessFn) { if (isDomStrategy) {` block (single worker), locate the inner `for (; i < chunkEnd; i++) {` loop (around line 269).
Change:
```typescript
                    const rawResult = await nextCapturePromise;

                    const data = rawResult.screenshotData;
                    let buf: Buffer;
                    if (data || !domLastFrameBuffer) {
                      if (data) domLastFrameData = data;
                      buf = Buffer.from(domLastFrameData as string, "base64");
                      domLastFrameBuffer = buf;
                    } else {
                      buf = domLastFrameBuffer;
                    }

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();
```
To:
```typescript
                    const rawResult = await nextCapturePromise;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    const data = rawResult.screenshotData;
                    let buf: Buffer;
                    if (data || !domLastFrameBuffer) {
                      if (data) domLastFrameData = data;
                      buf = Buffer.from(domLastFrameData as string, "base64");
                      domLastFrameBuffer = buf;
                    } else {
                      buf = domLastFrameBuffer;
                    }
```

**Why**: By dispatching the asynchronous frame capture command before synchronously blocking the CPU for Base64 decoding, we pipeline the Chromium IPC and browser rendering with Node's CPU work.

## Correctness Check
Run `npm test -w packages/renderer` to ensure `run-all.ts` still passes.
