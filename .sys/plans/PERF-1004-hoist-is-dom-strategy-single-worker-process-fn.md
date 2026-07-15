---
id: PERF-1004
slug: hoist-is-dom-strategy-single-worker-process-fn
status: unclaimed
claimed_by: ""
created: 2024-07-28
completed: ""
result: ""
---

# PERF-1004: Hoist `isDomStrategy` loop in the single-worker `hasProcessFn` path

## Focus Area
The single-worker fast loops inside `CaptureLoop.ts` when `hasProcessFn` is true, specifically the chunk rendering inner loop where `isDomStrategy` is repeatedly evaluated.

## Background Research
Currently, inside the single worker loops for `hasProcessFn = true`, the code loops over `i` from 1 to `totalFrames - 1` and continuously checks `isDomStrategy` for every frame in the `for (; i < chunkEnd; i++)` inner loop:
```typescript
                let buf: any;
                if (isDomStrategy) {
                  // dom processing
                } else {
                  // canvas processing
                }
                // ... write logic
```
PERF-998 successfully unrolled the `isDomStrategy` checks for the initial frames (frame 0 and 1) in the `hasProcessFn` path, but the chunk loop (which handles the vast majority of frames) still contains the `if (isDomStrategy)` check. Because `isDomStrategy` is a boolean value that remains constant throughout the execution of the loop, V8 spends time parsing the branch and potentially failing branch prediction on it. By wrapping the chunk loop (`for (; i < chunkEnd; i++)`) in an outer `if (isDomStrategy)`, we eliminate the check from the hot path entirely, improving parser overhead, instruction cache behavior, and allowing strictly monomorphic JIT.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas single-worker benchmarks
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `isDomStrategy` branch inside the `for (; i < chunkEnd; i++)` chunk loop is evaluated thousands of times redundantly per run, leading to branch evaluation overhead and preventing monomorphic optimization of the inner block.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` out of the chunk loop in `hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, find the chunk loop inside the `if (hasProcessFn)` block (around line 270):
```typescript
            let i = 1;
            while (i < totalFrames - 1 && !aborted) {
              const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

              for (; i < chunkEnd; i++) {
                const rawResult = await nextCapturePromise;
                // ... timePromise
                let buf: any;
                if (isDomStrategy) {
                  // ... dom
                } else {
                  // ... canvas
                }
                // ... stream.write
              }
              // ... progress update
            }
```
Unroll it by pulling `if (isDomStrategy)` outside the `for` loop:
```typescript
            let i = 1;
            while (i < totalFrames - 1 && !aborted) {
              const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

              if (isDomStrategy) {
                for (; i < chunkEnd; i++) {
                  const rawResult = await nextCapturePromise;

                  const timePromise = timeDriver.setTime(
                    page,
                    (startFrame + i + 1) * compTimeStep,
                  );

                  nextCapturePromise = domBeginFrame!();
                  const data = rawResult.screenshotData;
                  let buf: any;
                  if (data) {
                    domLastFrameData = data;
                    buf = Buffer.from(data as string, "base64");
                    domLastFrameBuffer = buf;
                  } else {
                    buf = domLastFrameBuffer!;
                  }

                  const b = buf as Buffer;
                  pendingBytes += b.length;
                  const writeSuccess = stream.write(b);

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

              if (i - 1 === nextProgress) {
                // ...
              }
            }
```
*Note: This also intrinsically implements the buffer casting optimization (PERF-1000) for this block by typing the stream write!*

**Why**: Provides V8 with a guaranteed monomorphic type context inside the tight loop, avoiding inline cache misses and redundant branch execution.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken, and run Vitest for both `verify-canvas-strategy` and `verify-dom-strategy-capture`.
