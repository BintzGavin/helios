---
id: PERF-809
slug: base64-buffer-pool
status: complete
claimed_by: "jules"
created: 2024-06-21
completed: "2026-06-20"
result: "improved"
---

# PERF-809: Base64 Decode Buffer Pool for DOM Capture

## Focus Area
DOM Rendering Pipeline - `CaptureLoop.ts` FFmpeg stream writer path.

## Background Research
In PERF-798, we introduced a pre-allocated buffer for Base64 decoding (`buffer.write(data, 'base64')`), bypassing the O(N) memory allocation overhead of `Buffer.from()` or `stream.write(string, 'base64')`. This yielded a ~40% speedup in decoding time.
However, in PERF-806, we reverted this optimization because Node.js's stream implementation queues underlying memory references when applying backpressure. Reusing a single pre-allocated buffer meant subsequent frames overwrote the queued data before FFmpeg could consume it, causing visual corruption.
To safely restore this highly effective performance optimization, we can use a **Buffer Pool** (a fixed-size ring buffer) instead of a single buffer. Since the fast path explicitly waits (`await this.drainPromise`) when `stream.writableLength >= 16777216` (16MB), and a typical 1080p frame is ~300KB, the maximum theoretical queue depth is ~55 frames. A pool of 64 pre-allocated buffers strictly guarantees that a buffer will be fully drained by FFmpeg before it cycles around to be reused.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s
- **Bottleneck analysis**: Node.js natively delegates string-to-buffer Base64 decoding to V8's C++ layer, which dynamically allocates a new Buffer instance per frame in the hot loop, putting pressure on the Garbage Collector.

## Implementation Spec

### Step 1: Initialize the Buffer Pool
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker fast path (inside `if (poolLen === 1) {`), just before the `try {` block (or inside it), initialize a pool of 64 Buffers.

```typescript
const POOL_SIZE = 64;
const bufferPool: Buffer[] = new Array(POOL_SIZE);
let poolIndex = 0;
```
**Why**: 64 is a power of two (allowing fast bitwise modulo `& (POOL_SIZE - 1)`) and exceeds the maximum possible backpressure queue depth (16MB / 300KB ≈ 55).

### Step 2: Decode Base64 into the Pool
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Modify the write block to pull a buffer from the pool, expand it if necessary using precise capacity math (from PERF-805) combined with exponential growth (from PERF-800), and write the decoded subarray to the stream.

Update the write block to look like this:

<<<<<<< SEARCH
                    if (isString === null) isString = typeof buffer === 'string';
                    if (!(isString ? stream.write(buffer as any, 'base64') : stream.write(buffer as any)) && stream.writableLength >= 16777216) {
                            await this.drainPromise;
                        }
=======
                    if (isString === null) isString = typeof buffer === 'string';

                    let writeSuccess = false;
                    if (isString) {
                        const str = buffer as string;
                        const maxBytes = (str.length * 3) >>> 2;
                        let buf = bufferPool[poolIndex];
                        if (!buf || buf.length < maxBytes) {
                            buf = Buffer.allocUnsafe(maxBytes + (maxBytes >> 1)); // 1.5x capacity
                            bufferPool[poolIndex] = buf;
                        }
                        const written = buf.write(str, 'base64');
                        writeSuccess = stream.write(buf.subarray(0, written));
                        poolIndex = (poolIndex + 1) & (POOL_SIZE - 1);
                    } else {
                        writeSuccess = stream.write(buffer as any);
                    }

                    if (!writeSuccess && stream.writableLength >= 16777216) {
                            await this.drainPromise;
                        }
>>>>>>> REPLACE

*(Apply this to both `if (hasProcessFn)` and `else` branches inside the single worker loop).*

**Why**: This strictly avoids any frame corruption by ensuring no active stream buffer reference is reused within 64 frames, while completely avoiding per-frame GC allocations for base64 decoding.

## Variations
None.

## Canvas Smoke Test
Run a `canvas` mode benchmark or build to ensure shared loop code modifications do not break it.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode dom`. In the output `.mp4`, verify that the animation plays smoothly with absolutely no frame tearing, static, or out-of-order/flickering frames. (Note: if the benchmark hangs due to container timeout, test with a localized micro-script).

## Prior Art
- **PERF-798**: Proved that pre-allocated `buffer.write` is 40% faster than dynamic allocation.
- **PERF-800 / PERF-805**: Established the capacity scaling math `maxBytes + (maxBytes >> 1)` and bitwise byte calculations used here.
- **PERF-806**: Diagnosed the backpressure reference overwrite issue that this pool solves.
