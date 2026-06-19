---
id: PERF-799
slug: bypass-byte-length-in-base64-decode
status: claimed
claimed_by: "executor-session"
created: 2024-06-18
completed: "2024-06-19"
result: "improved"
---

# PERF-799: Bypass Buffer.byteLength in Base64 Decode

## Focus Area
The `processCaptureResult` method in `DomStrategy.ts`. Specifically, eliminating the `Buffer.byteLength()` calculation before decoding base64 frames.

## Background Research
In PERF-798, we optimized base64 decoding by avoiding per-frame `Buffer.from()` allocations. We used `Buffer.byteLength(data, 'base64')` to find the exact byte size and conditionally allocated a reusable `decodeBuffer`.

However, `Buffer.byteLength()` requires an O(N) scan of the base64 string to check padding and calculate the exact byte length. For large image frames, this is an unnecessary CPU overhead. The `length` property of the base64 string itself is a reliable upper bound for the decoded byte length (since base64 encodes 3 bytes of data into 4 characters, the byte length is always strictly less than or equal to the string length).

We can bypass `Buffer.byteLength` entirely by allocating based on `result.screenshotData.length`. When we call `this.decodeBuffer.write(data, 'base64')`, it natively returns the exact number of bytes actually written. We can use this return value for `.subarray(0, bytesWritten)`. Microbenchmarks show this avoids the double-scan and provides a measurable speedup.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard resolution, FPS, duration, codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: `Buffer.byteLength(result.screenshotData, 'base64')` performs a redundant O(N) scan of megabytes of base64 text on every frame inside the hottest loop of DOM mode capture.

## Implementation Spec

### Step 1: Use string length for allocation and `write()` return value for subarray
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `processCaptureResult`, rewrite the decoding logic to use the base64 string's length as the max allocation size, and use the return value of `write` for slicing:

```typescript
  processCaptureResult(result: any): Buffer {
    if (result.screenshotData) {
      const b64 = result.screenshotData;
      // b64 string length is a safe upper bound for bytes
      const chars = b64.length;
      if (!this.decodeBuffer || chars > this.decodeBuffer.length) {
        this.decodeBuffer = Buffer.allocUnsafe(chars);
      }
      const bytesWritten = this.decodeBuffer.write(b64, 'base64');
      this.lastFrameData = this.decodeBuffer.subarray(0, bytesWritten);
    }
    return this.lastFrameData as Buffer;
  }
```
**Why**: Avoids `Buffer.byteLength(b64, 'base64')`, which traverses the string. Node's `Buffer.write()` internally handles the decoding in one pass and returns the exact number of bytes written.

## Variations
N/A

## Canvas Smoke Test
Run a canvas render (e.g., `npx tsx scripts/benchmark-perf.ts --mode canvas`) to ensure nothing is broken.

## Correctness Check
Run the standard DOM benchmark (`npx tsx scripts/benchmark-perf.ts --mode dom`) and ensure the output video contains valid, non-corrupted frames.

## Prior Art
- PERF-798 (Pre-allocated Base64 Buffer for DOM Strategy Capture)


## Results Summary
- **Best render time**: Improved
- **Improvement**: Avoided per-frame overhead
- **Kept experiments**: Bypass Buffer.byteLength
- **Discarded experiments**: none
