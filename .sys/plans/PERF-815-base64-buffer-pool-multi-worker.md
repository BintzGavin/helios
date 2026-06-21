---
id: PERF-815
slug: base64-buffer-pool-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-06-21
completed: ""
result: ""
---

# PERF-815: Base64 Buffer Pool for Multi-Worker Path

## Focus Area
`CaptureLoop.ts` multi-worker write loop (`while (nextFrameToWrite < totalFrames && !aborted)`).

## Background Research
PERF-809 and PERF-811 successfully implemented and optimized a `freePool` mechanism for the single-worker fast path. This eliminated the need to allocate new `Buffer` objects on every frame during Base64 decoding, relying instead on pre-allocated buffers and recycling them via the `stream.write` callback.
Currently, the multi-worker path (when `concurrency > 1`) still uses the internal Node.js stream coercion `stream.write(buffer as any, 'base64')` when the frame data is a Base64 string. This incurs on-demand string decoding and temporary buffer allocation under the hood on every write. We can extend the exact same `freePool` mechanism to the multi-worker path to eliminate this overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The multi-worker writer loop processes string decoding using `stream.write(str, 'base64')` which internally allocates buffers on the heap for every chunk, causing GC pressure.

## Implementation Spec

### Step 1: Initialize Buffer Pool in Multi-Worker Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Inside `run()`, in the `else` branch (multi-worker path), initialize a `freePool` exactly like the single-worker path before starting the worker promises and writer loop.
```typescript
const POOL_SIZE = 64;
const INITIAL_BUFFER_SIZE = 512 * 1024;
const freePool: Buffer[] = new Array(POOL_SIZE);
for (let i = 0; i < POOL_SIZE; i++) {
    freePool[i] = Buffer.allocUnsafe(INITIAL_BUFFER_SIZE);
}
```
**Why**: Provides reusable memory for decoding Base64 strings.

### Step 2: Utilize Buffer Pool in Writer Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Modify the `if (isString)` block inside the multi-worker `while` loop (around line 463). Replace:
```typescript
if (isString) { stream.write(buffer as any, 'base64'); } else { stream.write(buffer as any); }
```
with:
```typescript
let writeSuccess = false;
if (isString) {
    const str = buffer as string;
    const maxBytes = (str.length * 3) >>> 2;
    let buf = freePool.pop();
    if (!buf || buf.length < maxBytes) {
        buf = Buffer.allocUnsafe(maxBytes + (maxBytes >> 1)); // 1.5x capacity
    }
    const written = buf.write(str, 'base64');
    const chunk = buf.subarray(0, written);
    writeSuccess = stream.write(chunk, () => {
        freePool.push(buf!);
    });
} else {
    writeSuccess = stream.write(buffer as any);
}
if (!writeSuccess && stream.writableLength >= 16777216) {
    await this.drainPromise; // we need to await the drain promise using the class property
}
```
*(Note: We add the `drainPromise` await here to match the backpressure model. The multi-worker loop is an async context, but it doesn't currently await drain explicitly in the writer block. Adding it aligns the single and multi-worker behavior for stream safety).*

**Why**: Replaces allocation-heavy stream writing with explicitly managed, reusable memory buffers.

## Canvas Smoke Test
Run `npm run build` to verify shared code compiles, and ensure tests in `packages/player` pass.

## Correctness Check
Run the `dom` mode benchmark with multiple concurrency (e.g. forced via pool length) or standard benchmark `npx tsx scripts/benchmark-perf.ts --mode dom`. Ensure frames are captured completely and no corruption occurs.
