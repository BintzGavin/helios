---
id: PERF-964
slug: hoist-dombeginframe-single-worker-nodeprocess-true
status: unclaimed
claimed_by: ""
created: 2024-07-10
completed: ""
result: ""
---

# PERF-964: Hoist domBeginFrame before Base64 Decode in Single-Worker Loop (hasProcessFn = true)

## Focus Area
The single-worker DOM strategy chunked loop in `packages/renderer/src/core/CaptureLoop.ts` when `hasProcessFn` is true (around lines 260-330).

## Background Research
PERF-960 and PERF-878 successfully optimized the single-worker DOM loops by overlapping CPU-bound operations with Chromium rendering. By invoking `domBeginFrame!()` to dispatch the capture command for frame N+1 *before* doing synchronous operations on frame N, Chromium can generate pixels concurrently with Node's CPU work.

In the `hasProcessFn = true` path, the chunk loop currently reads:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    const data = rawResult.screenshotData;
                    if (data) {
                      domLastFrameData = data;
                    }
                    const buf = Buffer.from(domLastFrameData as string, "base64");

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```

As well as the trailing final-frame handler:
```typescript
                if (!aborted && totalFrames > 1) {
                  const rawResult = await nextCapturePromise;

                  const data = rawResult.screenshotData;
                  if (data) {
                    domLastFrameData = data;
                  }
                  const buf = Buffer.from(domLastFrameData as string, "base64");

                  pendingBytes += buf.length;
                  const writeSuccessStr = stream.write(buf);
```

The synchronous C++ `Buffer.from(..., "base64")` call is executing *before* `timeDriver.setTime` and `domBeginFrame!()`. This means the Node.js event loop blocks on the string decode for ~2-4ms, during which Chromium is sitting entirely idle instead of preparing the next frame.

Hoisting the timeline seek and the capture promise dispatch above the `Buffer.from` allocation overlaps these two expensive operations. (Note: for the final frame trailing block, there is no next frame to dispatch, so it remains unchanged).

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Synchronous Base64 decode blocks the V8 main thread, preventing the next frame capture command from being sent to the Chromium instance until after decoding is complete.

## Implementation Spec

### Step 1: Hoist `domBeginFrame` in `hasProcessFn = true` chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, where `hasProcessFn` is true and `isDomStrategy` is true (inside the chunk loop starting around line 266):
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    const data = rawResult.screenshotData;
                    if (data) {
                      domLastFrameData = data;
                    }
                    const buf = Buffer.from(domLastFrameData as string, "base64");

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```
Change it to:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    const data = rawResult.screenshotData;
                    if (data) {
                      domLastFrameData = data;
                    }
                    const buf = Buffer.from(domLastFrameData as string, "base64");

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```

**Why**: Initiating the CDP request for the next frame before executing CPU-intensive string manipulation and stream writes allows the browser to process the request concurrently.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run tests to confirm standard DOM rendering output hasn't been corrupted or misaligned.
