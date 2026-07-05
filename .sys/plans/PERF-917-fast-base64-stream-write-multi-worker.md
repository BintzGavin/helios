---
id: PERF-917
slug: fast-base64-stream-write-multi-worker
status: complete
claimed_by: "executor-session"
created: 2024-07-05
completed: 2024-07-05
result: failed
---
# PERF-917: Optimize Base64 Stream Writes for Multi-Worker Paths

## Focus Area
`CaptureLoop.ts` - Fast path string writes to `stream` in the multi-worker loop.

## Background Research
Currently in `CaptureLoop.ts`, in the multi-worker path (lines ~1158 and ~1217), frame output strings (base64) are converted to Buffers using a pooled user-space buffer:
```typescript
const str = buffer as string;
const maxBytes = (str.length * 3) >>> 2;
let pooled = multiFreePool.pop();
// ... allocate if necessary ...
const written = pooled.buffer.write(str, "base64");
const chunk = pooled.buffer.subarray(0, written);
pendingBytes += written;
writeSuccess = stream.write(chunk, pooled.freeCb);
```

Node streams natively handle strings and encoding, passing the base64 string directly to the C++ core: `stream.write(str, 'base64')`.

Microbenchmarks from earlier studies (like PERF-902, which focused on similar logic for single-workers) show that avoiding user-space array operations (`pool.pop()`, `buffer.write`, `.subarray`, etc.) and instead letting Node's native stream C++ handle the base64 translation directly reduces V8 execution time by ~52%.

This plan extends the `stream.write(str, 'base64')` optimization to the multi-worker DOM fast paths.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: CPU overhead in V8 doing `buffer.write` and user-space pooling for base64 strings when Node's native C++ stream pipeline is significantly faster.

## Implementation Spec

### Step 1: Remove `multiFreePool` base64 writing in multi-worker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer path (around lines ~1158 and ~1215), find the two locations that do this:
```typescript
              const str = buffer as string;
              const maxBytes = (str.length * 3) >>> 2;
              let pooled = multiFreePool.pop();
              if (!pooled || pooled.buffer.length < maxBytes) {
                pooled = new PooledBuffer(
                  maxBytes + (maxBytes >> 1),
                  multiFreePool,
                );
              }
              const written = pooled.buffer.write(str, "base64");
              const chunk = pooled.buffer.subarray(0, written);
              pendingBytes += written;
              writeSuccess = stream.write(chunk, pooled.freeCb);
```
(and the second occurrence for `chunkEnd` loop).

Replace them directly with:
```typescript
              const str = buffer as string;
              const maxBytes = (str.length * 3) >>> 2;
              pendingBytes += maxBytes;
              writeSuccess = stream.write(str, "base64");
```
*(Note: Use `str` or `buffer as string` depending on what the local variable is called in that block).*

**Why**: Direct string writes bypass user-space JavaScript buffering overhead, shifting base64 decoding into highly optimized native C++ stream code, yielding ~2x faster stream ingestion.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark to ensure `Buffer` paths aren't broken.

## Correctness Check
Run FFmpeg tests (`npm test -w packages/renderer`) to verify PNG frames encode properly.

## Results Summary
- **Best render time**: 2894.59ms (vs baseline 1664.59ms in 150KB microbenchmark)
- **Improvement**: -73.89%
- **Kept experiments**: None
- **Discarded experiments**: Replaced multi-worker user-space pooling with native `stream.write(str, "base64")`.
