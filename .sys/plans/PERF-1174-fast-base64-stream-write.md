---
id: PERF-1174
slug: fast-base64-stream-write
status: claimed
claimed_by: "executor"
created: 2024-11-05
completed: "2024-11-05"
result: "improved"
---

# PERF-1174: Optimize base64 String Stream Writes

## Focus Area
Base64 string piping to FFmpeg via `stream.write()` inside `CaptureLoop.ts` when rendering in DOM mode.

## Background Research
Currently, when buffering `dom` frame outputs to convert from Base64 strings into Buffers, `CaptureLoop.ts` uses `Buffer.from(rawResult as string, "base64")` to synchronously allocate a new Buffer on the JS heap, copy the decoded data, and then call `stream.write(buf)`.
However, Node.js streams natively support writing strings directly with an encoding via `stream.write(string, encoding)`. This delegates the base64 decoding directly to Node's internal C++ stream implementations.
In local microbenchmark testing, using `stream.write(str, "base64")` was significantly faster than using `Buffer.from` and then passing the buffer. This completely eliminates the need for V8 heap buffer allocations for the fast path in single worker loops and simplifies multi-worker loops.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Mode: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary synchronous CPU overhead in V8 doing `Buffer.from(..., "base64")` inside the hot frame capture loops.

## Implementation Spec

### Step 1: Optimize stream writes in CaptureLoop.ts
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `isDomStrategy` paths, avoid allocating a `Buffer` entirely.
Replace these instances:
```typescript
          const buf = Buffer.from(rawResult as string, "base64");

          pendingBytes += buf.length;
          if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
```
and
```typescript
              const buf = Buffer.from(rawResult as string, "base64");

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
```
and
```typescript
            const buf = Buffer.from(rawResult as string, "base64");

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
```
with:
```typescript
          const base64Str = rawResult as string;
          const byteLength = (base64Str.length * 3) >>> 2;
          pendingBytes += byteLength;
          if (!stream.write(base64Str, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
```

For the multi-worker path, change the `runWorker` for DOM strategy to directly store the string in the ring buffer instead of allocating a `Buffer`:
```typescript
                const rawResult = await strategy.capture(page, i * timeStep);
                frameBufferRing[i & ringMask] = rawResult as string;
                writerWaiterPromise.resolve();
```

Then, in the multi-worker `writer` loop, handle both `string` and `Buffer` types from the ring buffer:
```typescript
              const buffer = frameBufferRing[ringIndex];
              frameBufferRing[ringIndex] = null;
              if (typeof buffer === "string") {
                  const byteLength = (buffer.length * 3) >>> 2;
                  pendingBytes += byteLength;
                  if (!stream.write(buffer, "base64") && pendingBytes >= MAX_PENDING_BYTES) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }
              } else {
                  pendingBytes += (buffer as Buffer).length;
                  if (!stream.write(buffer as Buffer) && pendingBytes >= MAX_PENDING_BYTES) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }
              }
```

**Why**: Node streams handle string base64 encodings internally in C++ drastically faster, bypassing V8 JS Buffer heap allocation and JS-side copies.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark (`--mode=canvas`) to ensure standard `Buffer` writing paths are unaffected.

## Correctness Check
Run FFmpeg verify tests (`npm run test -w packages/renderer`) to ensure streams are fully intact and correctly formatted for PNG base64 decoding.
