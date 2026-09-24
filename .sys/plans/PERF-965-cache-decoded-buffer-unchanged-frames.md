---
id: PERF-965
slug: cache-decoded-buffer-unchanged-frames
status: complete
claimed_by: "jules"
claimed_by: ""
created: 2024-07-10
completed: "2024-07-10"
result: "keep"
---

# PERF-965: Cache Decoded Base64 Buffers for Unchanged Frames in Single-Worker Loop

## Focus Area
The single-worker DOM strategy hot path in `packages/renderer/src/core/CaptureLoop.ts` (specifically where `hasProcessFn` is true).

## Background Research
Chromium CDP's `HeadlessExperimental.beginFrame` optimizes captures by returning an empty `screenshotData` string if a frame has not visually changed since the last capture. Currently, `CaptureLoop.ts` handles this by caching the raw Base64 string in `domLastFrameData` and re-decoding it on every identical frame via `Buffer.from(domLastFrameData, "base64")`.

Because Node.js stream writes (`stream.write(buf)`) do not mutate the passed Buffer, we can safely cache the *decoded* `Buffer` instead of the raw Base64 string. By keeping a `domLastFrameBuffer` variable, we can completely eliminate the CPU-bound synchronous `Buffer.from` string decoding overhead for all unchanged frames (static periods in animations, delays, etc.).

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Repeated synchronous C++ `Buffer.from` allocations and string decodings block the V8 main thread during periods where the composition is visually static, wasting CPU cycles on identical work.

## Implementation Spec

### Step 1: Introduce a `Buffer` Cache Variable
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `hasProcessFn` true block, around where `domLastFrameData` is initialized (around line 190):
Add a new variable to cache the buffer:
```typescript
      let domLastFrameData: any = isDomStrategy
        ? (strategy as any).lastFrameData
        : null;
      let domLastFrameBuffer: Buffer | null = null;
```

### Step 2: Utilize the Cache in the Initial Frame Setup
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the initial frame setup block (around line 230):
```typescript
            if (isDomStrategy) {
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameData = data;
              }
              buffer = domLastFrameData;
            }
```
Change the following `Buffer.from` logic to use caching:
```typescript
            let writeSuccess = false;
            if (isDomStrategy) {
              if ((rawResult as any).screenshotData || !domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from(buffer as string, "base64");
              }
              const buf = domLastFrameBuffer;
              pendingBytes += buf.length;
              writeSuccess = stream.write(buf);
```

### Step 3: Utilize the Cache in the Main Chunked Loop and Final Frame
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `chunkEnd` loop (around line 270) and final frame block (around line 308):
```typescript
                    const data = rawResult.screenshotData;
                    if (data) {
                      domLastFrameData = data;
                    }
                    const buf = Buffer.from(domLastFrameData as string, "base64");
```
Replace with:
```typescript
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

**Why**: Reusing the already allocated and decoded Node.js `Buffer` for duplicate frames completely removes the CPU decode penalty from V8.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure no syntax errors and Canvas path safety.

## Correctness Check
Run tests to confirm standard DOM rendering output hasn't been corrupted.
