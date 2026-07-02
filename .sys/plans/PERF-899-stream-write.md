---
id: PERF-899
slug: stream-write
status: unclaimed
claimed_by: ""
created: 2024-07-02
completed: ""
result: ""
---

# PERF-899: Optimize FFmpeg String Stream Writes

## Focus Area
Base64 string piping to FFmpeg via `stream.write()` inside `CaptureLoop.ts`.

## Background Research
Currently, when buffering `dom` frame outputs to convert from Base64 into Buffers, `CaptureLoop` takes the string and writes it to a pooled buffer `pool.write(str, "base64")`, subarrays the buffer, and then calls `stream.write(chunk)`.
However, Node.js streams natively support writing strings with an encoding. Microbenchmarks showed that writing directly to the stream `stream.write(str, "base64")` bypasses the user-space array pool entirely and delegates the encoding directly to Node's internal C++ stream implementations.
In local testing:
- Using `pool.write + subarray` then `stream.write(chunk)`: ~900ms overhead
- Using `stream.write(str, "base64")`: ~2ms overhead.
This completely eliminates the need for pooled buffer allocations, base64 writing into V8 memory, and subarray allocations for the fast path, effectively removing CPU-bound string-to-buffer translation overhead.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: CPU overhead in V8 doing `pooled.buffer.write(str, "base64")` and array manipulations in `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Remove Buffer Pooling in CaptureLoop.ts for Strings
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Find the instances where `str` is written to `stream` via:
```typescript
let pooled = freePool.pop();
if (!pooled || pooled.buffer.length < maxBytes) {
  // ...
}
const written = pooled.buffer.write(str, "base64");
const chunk = pooled.buffer.subarray(0, written);
pendingBytes += written;
writeSuccess = stream.write(chunk, pooled.freeCb);
```
2. Replace it directly with:
```typescript
pendingBytes += maxBytes; // Approximation for backpressure
writeSuccess = stream.write(str, "base64");
```
Ensure you replace this in all occurrences (both single-worker and multi-worker loops).
Note: For multi-worker, you'll find it referencing `multiFreePool`. For single-worker, `freePool`.
**Why**: Node streams handle string encodings internally in C++, saving significant V8 execution time.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark.

## Correctness Check
Run FFmpeg verify tests to ensure streams are fully intact and correctly formatted as PNG base64 decoding.
