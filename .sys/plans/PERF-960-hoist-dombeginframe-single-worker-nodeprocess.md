---
id: PERF-960
slug: overlap-dombeginframe-with-base64-decode-nodeprocess
status: unclaimed
claimed_by: ""
created: 2024-07-09
completed: ""
result: ""
---

# PERF-960: Overlap domBeginFrame with Base64 Decode in Single-Worker Loop (hasProcessFn = false)

## Focus Area
The single-worker DOM strategy chunked loop in `packages/renderer/src/core/CaptureLoop.ts` when `hasProcessFn` is false.

## Background Research
PERF-878 successfully optimized the single-worker `hasProcessFn = true` DOM loop by hoisting `nextCapturePromise = domBeginFrame!()` to execute *before* `Buffer.from(buf, "base64")` and `stream.write()`. This allowed the Playwright browser (Chromium) to render the next frame concurrently with Node.js synchronously decoding the current frame's Base64 string and writing it to FFmpeg.

However, inspecting `packages/renderer/src/core/CaptureLoop.ts`, the equivalent block for `hasProcessFn = false` (around line 535) still evaluates these sequentially:
1. `rawResult = await nextCapturePromise;`
2. `buf = Buffer.from(..., "base64");`
3. `timeDriver.setTime(...)`
4. `nextCapturePromise = domBeginFrame!()`
5. `stream.write(...)`

By moving the `timeDriver.setTime()` and `domBeginFrame!()` calls *before* `Buffer.from()`, we can achieve the same overlapping concurrency. When `domBeginFrame` executes, it sends a CDP message. The browser can start interpreting it while Node.js spends CPU cycles parsing the base64 string.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Synchronous Base64 decode blocks the V8 main thread, preventing the next frame capture command from being sent to the Chromium instance until after decoding is complete.

## Implementation Spec

### Step 1: Hoist `domBeginFrame` in `hasProcessFn = false` chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, where `hasProcessFn` is false and `isDomStrategy` is true (inside the loop starting around line 533):
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    const buf = Buffer.from(rawResult as unknown as string, "base64");

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

                    const buf = Buffer.from(rawResult as unknown as string, "base64");

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```

### Step 2: Ensure Final Frame Catch is Clean
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
The final frame block for `hasProcessFn = false` (around line 565) is currently:
```typescript
                if (!aborted && totalFrames > 1) {
                  const rawResult = await nextCapturePromise;

                  const buf = Buffer.from(rawResult as unknown as string, "base64");

                  pendingBytes += buf.length;
                  const writeSuccessStr = stream.write(buf);
```
No changes are necessary here because this is the last frame, so there is no `domBeginFrame` command to hoist.

**Why**: Initiating the CDP request for the next frame before executing CPU-intensive string manipulation and stream writes allows the browser to process the request concurrently.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run tests to confirm standard DOM rendering output hasn't been corrupted or misaligned.
