---
id: PERF-902
slug: fast-base64-stream-write
status: unclaimed
claimed_by: ""
created: 2024-07-02
completed: ""
result: ""
---

# PERF-902: Optimize FFmpeg String Stream Writes

## Focus Area
Base64 string piping to FFmpeg via `stream.write()` inside `CaptureLoop.ts`.

## Background Research
Currently, when buffering `dom` frame outputs to convert from Base64 strings into Buffers, `CaptureLoop` takes the string and writes it to a pooled buffer via V8/Node memory: `pool.write(str, "base64")`, subarrays the buffer, and then calls `stream.write(chunk)`.
However, Node.js streams natively support writing strings directly with an encoding. Microbenchmarks showed that writing directly to the stream `stream.write(str, "base64")` bypasses the user-space array pool entirely and delegates the encoding directly to Node's highly optimized internal C++ stream implementations.
In local microbenchmark testing:
- Using `pool.write + subarray` then `stream.write(chunk)`: ~1021ms overhead
- Using `stream.write(str, "base64")`: ~482ms overhead.
This completely eliminates the need for pooled buffer allocations, base64 writing overhead in JS memory, and subarray allocations for the fast path, effectively cutting CPU-bound string-to-buffer translation overhead in half.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60fps
- **Mode**: `dom` (single-worker & multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Heavy CPU overhead in V8 doing `pooled.buffer.write(str, "base64")` and user-space pooled array manipulations in `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Remove Buffer Pooling in CaptureLoop.ts for Strings
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Find all 10 instances across single-worker and multi-worker loops where `buf` or `buffer` (which are base64 strings) are written to `stream` via the free pool.

For example, replace this pattern:
```typescript
                    const maxBytes = (buf.length * 3) >>> 2;
                    let pooled = freePool.pop();
                    if (!pooled || pooled.buffer.length < maxBytes) {
                      pooled = new PooledBuffer(
                        maxBytes + (maxBytes >> 1),
                        freePool,
                      );
                    }
                    const written = pooled.buffer.write(buf, "base64");
                    const chunk = pooled.buffer.subarray(0, written);

                    pendingBytes += written;
                    const writeSuccessStr = stream.write(chunk, pooled.freeCb);
```
Directly with:
```typescript
                    const maxBytes = (buf.length * 3) >>> 2;
                    pendingBytes += maxBytes;
                    const writeSuccessStr = stream.write(buf, "base64");
```
Apply this to all `isDomStrategy` paths in both the single-worker (where it uses `freePool`) and the multi-worker path (where it uses `multiFreePool`).

**Why**: Node streams handle string base64 encodings internally in C++ drastically faster, bypassing all JS user-space pooling and array slicing overhead.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark to ensure standard `Buffer` writing paths are unaffected.

## Correctness Check
Run FFmpeg verify tests (`npm run test -w packages/renderer`) to ensure streams are fully intact and correctly formatted for PNG base64 decoding.
