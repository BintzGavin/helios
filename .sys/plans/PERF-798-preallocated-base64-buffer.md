---
id: PERF-798
slug: preallocated-base64-buffer
status: unclaimed
claimed_by: ""
created: 2024-06-18
completed: ""
result: ""
---

# PERF-798: Optimize Base64 Decoding via Pre-allocated Buffer in DomStrategy

## Focus Area
The `processCaptureResult` method in `DomStrategy.ts`. Specifically, optimizing the `Buffer.from(result.screenshotData, 'base64')` call which decodes frame pixel data from Chromium.

## Background Research
According to internal memory (and confirmed via Node.js microbenchmarks in `test_b64.js`), calling `Buffer.from(data, 'base64')` allocates a new Buffer object on every frame, putting pressure on V8's garbage collector in the hot loop. The microbenchmark shows that decoding base64 data into an existing pre-allocated Buffer using `buffer.write(data, 'base64')` (and taking a `.subarray(0, len)`) is significantly faster (~40% reduction in time) than allocating a new Buffer each time for large frames (e.g. 1920x1080).

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard resolution, FPS, duration, codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `Buffer.from` call inside `processCaptureResult` forces a new heap allocation for every frame of the video, creating memory fragmentation and GC pauses.

## Implementation Spec

### Step 1: Add a pre-allocated buffer property to DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add a private property `private decodeBuffer: Buffer | null = null;` to the `DomStrategy` class.
**Why**: This buffer will be reused across frames to hold decoded image data.

### Step 2: Implement fast base64 decoding in processCaptureResult
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rewrite the `processCaptureResult` method from:
```typescript
  processCaptureResult(result: any): Buffer {
    if (result.screenshotData) {
      this.lastFrameData = Buffer.from(result.screenshotData, 'base64');
    }
    return this.lastFrameData as Buffer;
  }
```
to:
```typescript
  processCaptureResult(result: any): Buffer {
    if (result.screenshotData) {
      const len = Buffer.byteLength(result.screenshotData, 'base64');
      if (!this.decodeBuffer || len > this.decodeBuffer.length) {
        this.decodeBuffer = Buffer.allocUnsafe(len);
      }
      this.decodeBuffer.write(result.screenshotData, 'base64');
      this.lastFrameData = this.decodeBuffer.subarray(0, len);
    }
    return this.lastFrameData as Buffer;
  }
```
**Why**: `Buffer.byteLength` computes the exact number of bytes required without allocating. We check if our cached `this.decodeBuffer` is large enough; if not, we allocate it (or grow it). We then write the base64 string directly into this pre-allocated buffer using `buffer.write` and use `.subarray()` to return a view of the correct size without making another copy. This pattern vastly reduces garbage collection overhead in hot loops.

## Variations
N/A

## Canvas Smoke Test
Run a canvas render (e.g., `npx tsx scripts/benchmark-perf.ts`) to ensure nothing is broken.

## Correctness Check
Run the standard DOM benchmark and ensure the output video contains valid, non-corrupted frames.

## Prior Art
- V8 Buffer memory optimizations.
- The `test_b64.js` script run in the sandbox confirming `Buffer.write()` is ~40% faster.
