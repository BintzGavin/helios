---
id: PERF-810
slug: prebind-base64-pool-callback
status: unclaimed
claimed_by: ""
created: 2024-06-20
completed: ""
result: ""
---
# PERF-810: Prebind Base64 Pool Callback

## Focus Area
DOM Strategy capture fast path in `CaptureLoop.ts`.

## Background Research
In PERF-809, a `freePool` was introduced to recycle `Buffer` instances for base64 decoding. This effectively resolved memory bloat and prevented backpressure frame corruption. However, the recycling mechanism uses an inline anonymous function `() => { freePool.push(buf!); }` passed to `stream.write()`. Because this closure is declared inside the hot loop, V8 must allocate a new function object and context for every single frame (e.g., thousands of times per render). By binding the callback to the buffer object permanently upon allocation, we can completely eliminate this per-frame closure allocation and reduce GC micro-interruptions.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s (PERF-809)
- **Bottleneck analysis**: GC pressure and instruction overhead from allocating anonymous closures on the V8 fast path.

## Implementation Spec

### Step 1: Update Pool Type
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the `freePool` array initialization (around line 157) from:
```typescript
        const freePool: Buffer[] = [];
```
To:
```typescript
        interface PooledBuffer {
            buf: Buffer;
            cb: () => void;
        }
        const freePool: PooledBuffer[] = [];
```
**Why**: This allows us to store the buffer alongside its permanently bound recycling callback.
**Risk**: None, strictly typed internal pool.

### Step 2: Prebind Callback in `hasProcessFn` Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `if (hasProcessFn)` fast loop, replace the base64 write block:
```typescript
                        let buf = freePool.pop();
                        if (!buf || buf.length < maxBytes) {
                            buf = Buffer.allocUnsafe(maxBytes + (maxBytes >> 1)); // 1.5x capacity
                        }
                        const written = buf.write(str, 'base64');
                        const chunk = buf.subarray(0, written);
                        writeSuccess = stream.write(chunk, () => {
                            freePool.push(buf!);
                        });
```
With:
```typescript
                        let pooled = freePool.pop();
                        if (!pooled || pooled.buf.length < maxBytes) {
                            const newBuf = Buffer.allocUnsafe(maxBytes + (maxBytes >> 1)); // 1.5x capacity
                            const p = { buf: newBuf, cb: () => {} };
                            p.cb = () => { freePool.push(p); };
                            pooled = p;
                        }
                        const written = pooled.buf.write(str, 'base64');
                        const chunk = pooled.buf.subarray(0, written);
                        writeSuccess = stream.write(chunk, pooled.cb);
```
**Why**: The closure is now created only once per buffer allocation (typically 1-2 times total per render) rather than every frame.

### Step 3: Prebind Callback in non-`hasProcessFn` Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Repeat the exact same replacement from Step 2 in the `else` branch (the non-`hasProcessFn` single worker loop) where the same base64 write logic exists.
**Why**: Ensures both single-worker fast paths benefit from the optimization.

## Canvas Smoke Test
Run a quick canvas benchmark `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure the core loop wasn't broken by syntax errors.

## Correctness Check
Run the DOM mode benchmark `npx tsx scripts/benchmark-perf.ts --mode dom` to confirm frames are still correctly recycled and rendering completes without hanging.

## Prior Art
- PERF-809: Introduced the base64 free pool which improved DOM rendering speeds but added this closure overhead.
- PERF-693: Omitted stream write callbacks entirely to avoid overhead, which yielded a performance boost, proving that closure/callback overhead in `stdin.write` is significant.
