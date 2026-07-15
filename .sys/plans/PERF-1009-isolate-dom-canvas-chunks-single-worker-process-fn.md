---
id: PERF-1009
slug: isolate-dom-canvas-chunks-single-worker-process-fn
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1009: Isolate DOM and Canvas processing loops in the single-worker `hasProcessFn` path

## Focus Area
The single-worker chunk rendering loop inside `CaptureLoop.ts` when `hasProcessFn` is true.

## Background Research
Currently, inside the single-worker path for `hasProcessFn` (which handles frames requiring synchronous processing), the code uses a tight `for` loop to process frames: `for (; i < chunkEnd; i++)`. Inside this loop, it repeatedly evaluates `if (isDomStrategy)` for every frame.

Because `isDomStrategy` is a boolean value that remains constant throughout the execution of the loop, V8 spends time parsing the branch and potentially failing branch prediction on it. By wrapping the chunk loop in an outer `if (isDomStrategy)` check, we eliminate the condition from the hot path entirely. This optimization isolates the monomorphic DOM processing from the monomorphic Canvas processing, providing V8 with a guaranteed monomorphic type context inside the tight loop. This helps avoid polymorphic inline cache (PIC) misses during property access and removes redundant branch execution.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas single-worker benchmarks
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `isDomStrategy` branch inside the `for (; i < chunkEnd; i++)` chunk loop is evaluated thousands of times redundantly per run, leading to branch evaluation overhead and preventing strictly monomorphic block optimization.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` out of the chunk loop in `hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, find the chunk loop inside the `if (hasProcessFn)` block.
Unroll it by pulling `if (isDomStrategy)` outside the `for` loop.

From:
```typescript
            let i = 1;
            while (i < totalFrames - 1 && !aborted) {
              const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

              for (; i < chunkEnd; i++) {
                const rawResult = await nextCapturePromise;

                const timePromise = timeDriver.setTime(
                  page,
                  (startFrame + i + 1) * compTimeStep,
                );

                let buf: any;
                if (isDomStrategy) {
                  nextCapturePromise = domBeginFrame!();
                  const data = rawResult.screenshotData;
                  if (data) {
                    domLastFrameData = data;
                    buf = Buffer.from(data as string, "base64");
                    domLastFrameBuffer = buf;
                  } else {
                    buf = domLastFrameBuffer!;
                  }
                } else {
                  if (timePromise) await timePromise;
                  nextCapturePromise = strategy.capture(
                    page,
                    (i + 1) * timeStep,
                  );
                  buf = strategy.processCaptureResult!(rawResult);
                }

                pendingBytes += buf.length;
                const writeSuccess = stream.write(buf);

                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }
              }

              if (aborted) break;
              // ... progress update
            }
```

To:
```typescript
            let i = 1;
            while (i < totalFrames - 1 && !aborted) {
              const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

              if (isDomStrategy) {
                for (; i < chunkEnd; i++) {
                  const rawResult = await nextCapturePromise;

                  timeDriver.setTime(
                    page,
                    (startFrame + i + 1) * compTimeStep,
                  );

                  nextCapturePromise = domBeginFrame!();
                  const data = rawResult.screenshotData;
                  let buf: Buffer;
                  if (data) {
                    domLastFrameData = data;
                    buf = Buffer.from(data as string, "base64");
                    domLastFrameBuffer = buf;
                  } else {
                    buf = domLastFrameBuffer!;
                  }

                  pendingBytes += buf.length;
                  const writeSuccess = stream.write(buf);

                  if (!writeSuccess && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }
                }
              } else {
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
                  const buf = strategy.processCaptureResult!(rawResult);

                  pendingBytes += (buf as any).length;
                  const writeSuccess = stream.write(buf as any);

                  if (!writeSuccess && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }
                }
              }

              if (aborted) break;
              // ... progress update
```
*Note: In the `isDomStrategy` branch, `timePromise` can be removed as a local variable since it is not awaited and we can just call `timeDriver.setTime(...)`. For `stream.write`, use `Buffer` typed writing.*

**Why**: Isolates the DOM path from the canvas path to reduce redundant branch parser instructions and provide V8 with a guaranteed monomorphic type context inside the tight loop.

## Canvas Smoke Test
Run `npx vitest -t "verify-canvas-strategy"` to ensure the Canvas strategy path works.

## Correctness Check
Run `npx vitest -t "verify-dom-strategy-capture"` to ensure the DOM path is still functioning correctly. Run `npm run test -w packages/renderer` to ensure nothing is broken.

## Prior Art
Similar unrolling of `isDomStrategy` logic has worked previously (e.g., PERF-988, PERF-998) yielding positive isolation metrics.
