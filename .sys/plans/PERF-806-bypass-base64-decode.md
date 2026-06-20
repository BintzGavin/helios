---
id: PERF-806
slug: bypass-base64-decode
status: complete
claimed_by: "jules"
created: 2024-05-28
completed: ""
result: "improved"
---
# PERF-806: Remove Buffer Decoding from Capture Loop

## Focus Area
The `DomStrategy.ts` processCaptureResult and `CaptureLoop.ts` fast path.

## Background Research
Currently, `DomStrategy.ts` takes the Base64 string from CDP `screenshotData` and uses `buf.write(b64, 'base64')` into a pre-allocated buffer (`decodeBuffer`). It then returns `buf.subarray(0, bytesWritten)` to `CaptureLoop`, which writes it to FFmpeg's `stdin` using `stream.write()`.

Because `stream.write()` handles backpressure async, passing a subarray over a reused buffer means we might overwrite the buffer with the next frame's data while the previous frame is still queued by Node.js for writing to the OS pipe. This could lead to frame corruption under heavy backpressure. While `Buffer.from(b64, 'base64')` allocates a new buffer for each frame and avoids this, it is slower and creates more GC pressure.

More importantly, Node.js `stream.write()` natively supports writing strings with an encoding. If we simply return the Base64 string from `DomStrategy` and write it using `stream.write(b64, 'base64')`, we skip the intermediate Node.js `Buffer` manipulation and copying entirely in our code. Although `stream.write` will allocate internally, we reduce the V8 JavaScript-land processing steps and memory allocation complexity per frame.

## Benchmark Configuration
- **Composition URL**: DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.000s
- **Bottleneck analysis**: Base64 buffer decoding and subarray wrapper allocation in `DomStrategy.ts`.

## Implementation Spec

### Step 1: Modify `DomStrategy.ts` to return the Base64 string directly
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove `this.decodeBuffer` properties.
2. In `processCaptureResult(result: any)`, if `result.screenshotData` is present, just return it directly (or assign to `this.lastFrameData`).
```typescript
  processCaptureResult(result: any): string | Buffer {
    if (result.screenshotData) {
      this.lastFrameData = result.screenshotData;
    }
    return this.lastFrameData as string | Buffer;
  }
```

### Step 2: Update `CaptureLoop.ts` to pass encoding to `stream.write()`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker and multi-worker loops, when calling `stream.write(buffer as any)`, check if the `buffer` is a string. If it is a string, pass `'base64'` as the encoding.
```typescript
const isString = typeof buffer === 'string';
if (!stream.write(buffer as any, isString ? 'base64' : undefined) && stream.writableLength >= 16777216) {
    await this.drainPromise;
}
```
Update all `stream.write` calls in `CaptureLoop.ts` (single worker, multi worker, and the final buffer write).

## Canvas Smoke Test
Run the Canvas test suite to ensure Canvas mode (which returns a Buffer) still works.

## Correctness Check
Run verify scripts or check the generated video to ensure frames are not corrupted.
