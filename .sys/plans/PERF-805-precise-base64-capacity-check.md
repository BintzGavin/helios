---
id: PERF-805
slug: precise-base64-capacity-check
status: unclaimed
claimed_by: ""
created: 2024-06-20
completed: ""
result: ""
---

# PERF-805: Precise Base64 Capacity Check

## Focus Area
DOM Rendering Pipeline - Hot Loop memory allocation in `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
In the frame capture loop, `DomStrategy` receives a Base64 string from CDP and decodes it into a persistent buffer to avoid GC pressure (implemented in PERF-798 and PERF-800).
Currently, the capacity check compares the buffer's byte length against the *character length* of the Base64 string (`chars > buf.length`).
Because Base64 encodes 3 bytes per 4 characters, the string length is ~33% larger than the actual decoded byte length.
If a decoded image requires 3MB but the Base64 string is 4MB, a buffer of 3.5MB would perfectly fit the decoded bytes. However, because `4MB > 3.5MB`, the current logic forces a premature reallocation. By checking against the true maximum byte length (`(chars * 3) >>> 2`), we prevent unnecessary buffer reallocations and V8 memory churn.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary buffer reallocations caused by comparing byte capacity against Base64 character length, leading to memory bloat and GC overhead in the V8 heap.

## Implementation Spec

### Step 1: Fix Buffer Capacity Check
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `processCaptureResult` method, replace `chars` with `maxBytes` calculated via bitwise arithmetic:
```typescript
<<<<<<< SEARCH
  processCaptureResult(result: any): Buffer {
    if (result.screenshotData) {
      const b64 = result.screenshotData;
      const chars = b64.length;
      let buf = this.decodeBuffer;
      if (!buf || chars > buf.length) {
        const newCapacity = buf
          ? Math.max(chars, buf.length + (buf.length >> 1))
          : chars;
        buf = Buffer.allocUnsafe(newCapacity);
        this.decodeBuffer = buf;
      }
=======
  processCaptureResult(result: any): Buffer {
    if (result.screenshotData) {
      const b64 = result.screenshotData;
      const maxBytes = (b64.length * 3) >>> 2;
      let buf = this.decodeBuffer;
      if (!buf || maxBytes > buf.length) {
        const newCapacity = buf
          ? Math.max(maxBytes, buf.length + (buf.length >> 1))
          : maxBytes;
        buf = Buffer.allocUnsafe(newCapacity);
        this.decodeBuffer = buf;
      }
>>>>>>> REPLACE
```
**Why**: Accurately bounds the buffer capacity to the needed bytes, eliminating premature logarithmic reallocations caused by the 33% Base64 string length overhead.

## Variations
N/A

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure no regressions in other pipelines.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode dom` to verify the buffer correctly decodes all frames without truncation or allocation errors.

## Prior Art
- PERF-798 (Pre-allocated Base64 Buffer for DOM Strategy Capture)
- PERF-800 (Exponential Capacity Growth for Base64 Decode Buffer)
