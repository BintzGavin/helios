---
id: PERF-976
slug: pipeline-single-worker-canvas-capture
status: unclaimed
claimed_by: ""
created: 2024-07-12
completed: ""
result: ""
---

# PERF-976: Pipeline single-worker Canvas capture and processing

## Focus Area
The single-worker Canvas strategy (`!isDomStrategy`) chunked loops in `packages/renderer/src/core/CaptureLoop.ts` (around lines 350-372 and 560-580).

## Background Research
In the single-worker DOM paths, we significantly improved performance by overlapping Chromium rendering (via `domBeginFrame!()`) with Node.js CPU work (Base64 decoding) for the previous frame.
In the single-worker Canvas paths (`!isDomStrategy`), the loop currently awaits the capture of frame `N`, sets the time for frame `N+1`, dispatches the capture for frame `N+1`, and THEN does synchronous processing (like `strategy.processCaptureResult!`) or stream writing for frame `N`.
Although `strategy.capture()` is dispatched before the synchronous processing, `timeDriver.setTime()` might be asynchronous and is `await`ed before `strategy.capture()` is dispatched. By moving the synchronous processing (`buf = strategy.processCaptureResult!(rawResult)` and `stream.write`) to occur *while* `timeDriver.setTime()` is executing (if asynchronous) or just restructuring the block for clarity, we can ensure the CPU work is maximally overlapped.

## Benchmark Configuration
- **Composition URL**: Standard Canvas benchmark
- **Render Settings**: Standard
- **Mode**: `canvas` (single worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The Node.js event loop blocks on `await timePromise` before dispatching `strategy.capture()`. The CPU-bound synchronous processing of the previous frame (`processCaptureResult!` and `stream.write`) happens *after* `await timePromise` and `strategy.capture()`, which is good for overlapping with `capture()`, but we miss the opportunity to overlap it with `timeDriver.setTime()` as well.

## Implementation Spec

### Step 1: Hoist synchronous processing above `await timePromise` in `hasProcessFn = true` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker `!isDomStrategy` loop (around line 350), change:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    let buf;
                    buf = strategy.processCaptureResult!(rawResult);
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
                  }
```
To:
```typescript
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );

                    let buf;
                    buf = strategy.processCaptureResult!(rawResult);
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }

                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );
                  }
```

### Step 2: Hoist stream writing above `await timePromise` in `hasProcessFn = false` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker `!isDomStrategy` loop (around line 560), change:
```typescript
                  for (; i < chunkEnd; i++) {
                    const buf = await nextCapturePromise;

                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    if (timePromise) await timePromise;

                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
                  }
```
To:
```typescript
                  for (; i < chunkEnd; i++) {
                    const buf = await nextCapturePromise;

                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );

                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }

                    if (timePromise) await timePromise;

                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );
                  }
```

**Why**: By processing the current frame (`processCaptureResult!` and `stream.write`) synchronously while `timePromise` is pending in the background, we fully utilize Node's event loop, preventing pipeline stalls during the page time advancement phase.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to ensure rendering streams continue to drain without issues.
