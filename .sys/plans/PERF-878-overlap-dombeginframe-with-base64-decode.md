---
id: PERF-878
slug: overlap-dombeginframe-with-base64-decode
status: complete
claimed_by: "jules"
created: 2025-02-12
completed: 2025-02-12
result: "keep"
---

# PERF-878: Overlap domBeginFrame with Base64 Decode and Remove Redundant Microtasks in DOM Fast Paths

## Focus Area
The single-worker DOM strategy chunked loops in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, optimizing the order of operations so that the browser can render the next frame concurrently while Node.js performs CPU-bound Base64 decoding, and removing an unnecessary `await undefined` that queues a microtask.

## Background Research
In the single-worker `CaptureLoop.ts`, the `isDomStrategy` paths that process string outputs currently perform operations in this order:
1. `rawResult = await nextCapturePromise;`
2. `const timePromise = timeDriver.setTime(...)`
3. Decode the base64 string to a buffer (Synchronous CPU-bound task taking ~2ms).
4. `await timePromise;`
5. `nextCapturePromise = domBeginFrame!();`

There are two major performance flaws here:
1. **Missed Concurrency**: `domBeginFrame!()` triggers the browser to start rendering the next frame. Because it is called *after* the base64 decode, the browser sits idle while Node.js blocks the thread decoding the current frame. If we hoist `nextCapturePromise = domBeginFrame!();` to happen *before* the base64 decode, the WebSocket message will be queued/sent, and the browser can render the next frame in parallel with Node's CPU work.
2. **Microtask Overhead**: In DOM strategy, `timeDriver.setTime()` synchronously returns `undefined`. Therefore, `await timePromise;` is `await undefined`, which unnecessarily queues a V8 microtask per frame.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 1.831s
- **Bottleneck analysis**: The browser and Node.js are executing strictly serially in the single-worker DOM strategy, and V8 is needlessly evaluating microtasks for undefined promises.

## Implementation Spec

### Step 1: Hoist `domBeginFrame` and remove `timePromise` in `hasProcessFn = true` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `hasProcessFn = true` path, inside `if (isString) { if (isDomStrategy) { ... } }`, locate the inner chunk loop:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;
                    const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);

                    let buf;
                    const data = rawResult.screenshotData;
                    if (data) domLastFrameData = data;
                    buf = domLastFrameData as string;

                    const maxBytes = (buf.length * 3) >>> 2;
                    let pooled = freePool.pop();
                    // ... buffer setup ...
                    const written = pooled.buffer.write(buf, "base64");
                    const chunk = pooled.buffer.subarray(0, written);

                    await timePromise;
                    nextCapturePromise = domBeginFrame!();

                    pendingBytes += written;
                    const writeSuccessStr = stream.write(chunk, pooled.freeCb);
                    // ...
```

Modify it to:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    let buf;
                    const data = rawResult.screenshotData;
                    if (data) {
                      domLastFrameData = data;
                    }
                    buf = domLastFrameData as string;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

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
                    // ...
```
**Why**: Starts browser rendering early and removes the microtask delay.

### Step 2: Hoist `domBeginFrame` and remove `timePromise` in `hasProcessFn = false` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `hasProcessFn = false` path, inside `if (isString) { if (isDomStrategy) { ... } }`, locate the inner chunk loop and apply the same hoisting logic:

From:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;
                    const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
                    const buf = rawResult as unknown as string;
                    // ... buffer setup and write ...
                    await timePromise;
                    nextCapturePromise = domBeginFrame!();
                    // ...
```

To:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;
                    const buf = rawResult as unknown as string;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    const maxBytes = (buf.length * 3) >>> 2;
                    // ... buffer setup and write ...
                    pendingBytes += written;
                    // ...
```
**Why**: Brings the same concurrency improvements to the second single-worker hot path.

## Variations
None.

## Canvas Smoke Test
Run `npm test -w packages/renderer` to ensure `isDomStrategy = false` paths are untouched and working.

## Correctness Check
Run `npm test -w packages/renderer` specifically focusing on `verify-cdp-shadow-dom-sync.ts` and `verify-dom-media-attributes.ts` to ensure frame rendering order and timestamps remain correct.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	1.347	300	222.64	490.0	keep	overlap domBeginFrame and Base64 decode
2	1.382	300	217.04	490.0	keep	overlap domBeginFrame and Base64 decode
3	1.364	300	219.87	490.0	keep	overlap domBeginFrame and Base64 decode
```
