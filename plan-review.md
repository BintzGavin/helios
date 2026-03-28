# Request for Plan Review: PERF-092-buffer-allocation

I propose the following plan to implement PERF-092.

## Implementation details
1. **Add a buffer pool to `DomStrategy`**
   - File: `packages/renderer/src/strategies/DomStrategy.ts`
   - I will add private class properties to `DomStrategy`:
     ```typescript
     private bufferPool: Buffer[] = Array.from({ length: 8 }, () => Buffer.allocUnsafe(1920 * 1080 * 2));
     private bufferIndex: number = 0;
     ```
   - In the `capture` method, I'll replace `const buffer = Buffer.from(screenshotData, 'base64');` with logic that writes the base64 payload into the pre-allocated buffers:
     ```typescript
     const byteLen = Buffer.byteLength(screenshotData, 'base64');
     let captureBuffer = this.bufferPool[this.bufferIndex];
     if (captureBuffer.length < byteLen) {
         captureBuffer = Buffer.allocUnsafe(Math.max(byteLen + 1024 * 1024, 1920 * 1080 * 2));
         this.bufferPool[this.bufferIndex] = captureBuffer;
     }
     const bytesWritten = captureBuffer.write(screenshotData, 'base64');
     const buffer = captureBuffer.subarray(0, bytesWritten);
     this.bufferIndex = (this.bufferIndex + 1) % 8;
     ```
   - This replacement will be made in both branches of `capture()` that deal with `screenshotData` (the target element branch and the main capture branch).

## Rationale
This eliminates multi-megabyte allocations and subsequent GC sweeps on every single frame. 8 buffers align with the active pipeline depth `pool.length * 8` constraint per worker, preventing data overwrites.
