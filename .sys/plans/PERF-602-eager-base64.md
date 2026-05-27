---
id: PERF-602
slug: eager-base64
status: unclaimed
claimed_by: ""
created: 2024-05-27
completed: ""
result: ""
---

# PERF-602: Eager Base64 Buffer Decoding in Capture Hot Loop

## Focus Area
Frame Capture Loop (`packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
Currently, `DomStrategy` returns frames as Base64 strings (via CDP). The `CaptureLoop` stores these strings in the `frameBufferRing` and later writes them to the FFmpeg process using `this.ffmpegManager.stdin.write(buffer, 'base64')`.
When a string is passed to a Node.js `Writable` stream, the stream internals must inspect the chunk type, check encodings, and dynamically allocate a `Buffer` via `Buffer.from(string, encoding)` before invoking the underlying C++ pipe write.
By eagerly decoding the Base64 string into a `Buffer` immediately within the worker's `.then()` fulfillment handler (before it enters the ring buffer), we achieve two optimizations:
1. We bypass the Node.js stream's internal string-coercion overhead, feeding it raw binary chunks that can be dispatched directly to `libuv`.
2. We reduce the memory footprint of the `frameBufferRing`. A Base64 string takes up significantly more heap memory than its decoded binary `Buffer` counterpart. Freeing the string earlier reduces V8 garbage collection pressure during the hot loop.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.267s (from RENDERER-EXPERIMENTS.md current best)
- **Bottleneck analysis**: Node.js stream encoding overhead and string garbage collection pressure in the IPC write phase.

## Implementation Spec

### Step 1: Eager Buffer Decoding in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` method, locate the `.then((buffer) => { ... })` block inside the `timePromise` chain (around line 180):

```typescript
                .then((buffer) => {
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                })
```

Change it to:
```typescript
                .then((buffer) => {
                    frameBufferRing[ringIndex] = typeof buffer === 'string' ? Buffer.from(buffer, 'base64') : buffer;
                    frameReadyRing[ringIndex] = 1;
                })
```

### Step 2: Simplify Stream Write
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the main writer loop (around line 235), simplify the write logic since the ring buffer will now strictly contain `Buffer` objects.
Change:
```typescript
                let canWriteMore: boolean;
                if (typeof buffer === 'string') {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, 'base64', this.handleWriteError);
                } else {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, this.handleWriteError);
                }
```
To:
```typescript
                // Buffer is always a Buffer here now due to the eager decode in runWorker
                const canWriteMore = this.ffmpegManager.stdin.write(buffer, this.handleWriteError);
```

**Why**: By eagerly converting the string to a Buffer, we eliminate the stream encoding overhead and reduce the memory footprint of frames waiting in the ring buffer.
**Risk**: `Buffer.from` allocation is synchronous and still happens on the main thread. If the Node.js internal stream decoder is heavily optimized with C++ bindings that we miss by doing it in userland JS, this could cause a slight regression.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance, followed by `npm run test -w packages/renderer` to verify output correctly retains all frames and avoids truncation.
