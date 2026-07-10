---
id: PERF-966
slug: cache-decoded-buffer-unchanged-frames-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-07-10
completed: ""
result: ""
---

# PERF-966: Cache Decoded Base64 Buffers for Unchanged Frames in Multi-Worker Loop

## Focus Area
The multi-worker DOM strategy chunked loop in `packages/renderer/src/core/CaptureLoop.ts` (when `hasProcessFn` is true, inside `runWorker`).

## Background Research
PERF-965 successfully optimized the single-worker DOM strategy loop by caching the decoded `Buffer` (`domLastFrameBuffer`) alongside the raw string (`domLastFrameData`) for unchanged frames. This prevented redundant, synchronous CPU-bound `Buffer.from(..., "base64")` operations on duplicate frames during static periods in animations, reducing V8 thread blocking.

Currently, the multi-worker DOM path handles caching identically to how the single-worker path used to:
```typescript
                    const rawResult = await nextCapturePromise;

                    const data = rawResult.screenshotData;
                    if (data) {
                      domLastFrameData = data;
                    }
                    const buf = Buffer.from(domLastFrameData as string, "base64");
```
And earlier:
```typescript
            let buffer;
            if (isDomStrategy) {
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameData = data;
              }
              buffer = domLastFrameData;
            } else {
```

By applying the same cache `domLastFrameBuffer` logic to the `hasProcessFn = true` blocks of `runWorker` (where `isDomStrategy` is used), we can avoid repetitive decoding in parallel threads just as we did in the single-thread, accelerating the whole render pool for static visuals.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker, e.g., 4 concurrency)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Repeated synchronous C++ `Buffer.from` allocations and string decodings block the V8 worker threads during periods where the composition is visually static, unnecessarily taking up CPU processing time that could be dedicated to dispatching or FFmpeg draining.

## Implementation Spec

### Step 1: Add `domLastFrameBuffer` to `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `runWorker` function (around line 710), where `domLastFrameData` is initialized:
```typescript
        let domLastFrameData: any = isDomStrategy
          ? (strategy as any).lastFrameData
          : null;
```
Add:
```typescript
        let domLastFrameBuffer: Buffer | null = null;
```

### Step 2: Utilize Cache in the Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `hasProcessFn = true` multi-worker chunk loop (inside `if (isDomStrategy)` around line 748):
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

                    frameReadyRing[ringIndex] = true;
                    frameBufferRing[ringIndex] = buf;
```
Change to:
```typescript
                  for (; i < chunkEnd; i++) {
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

                    frameReadyRing[ringIndex] = true;
                    frameBufferRing[ringIndex] = buf;
```

### Step 3: Utilize Cache for Final Frame Trailing Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the final frame block (around line 775):
```typescript
                if (!aborted && nextFrameToSubmit < totalFrames) {
                  const rawResult = await nextCapturePromise;

                  const data = rawResult.screenshotData;
                  if (data) {
                    domLastFrameData = data;
                  }
                  const buf = Buffer.from(domLastFrameData as string, "base64");

                  frameReadyRing[ringIndex] = true;
                  frameBufferRing[ringIndex] = buf;
```
Change to:
```typescript
                if (!aborted && nextFrameToSubmit < totalFrames) {
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

                  frameReadyRing[ringIndex] = true;
                  frameBufferRing[ringIndex] = buf;
```

**Why**: Reusing the already allocated and decoded Node.js `Buffer` for duplicate frames completely removes the CPU decode penalty from V8 in multi-worker parallel paths as well.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure no syntax errors.

## Correctness Check
Run tests to confirm standard DOM rendering output hasn't been corrupted.
