---
id: PERF-1005
slug: hoist-is-dom-strategy-single-worker-no-process-fn
status: unclaimed
claimed_by: ""
created: 2024-10-15
completed: ""
result: ""
---

# PERF-1005: Hoist `isDomStrategy` loop in the single-worker `!hasProcessFn` path

## Focus Area
The single-worker fast loops inside `CaptureLoop.ts` when `!hasProcessFn` is true, specifically the chunk rendering inner loop where `isDomStrategy` is repeatedly evaluated.

## Background Research
Currently, inside the single worker loops for `!hasProcessFn` (which handles strings for canvas frames or buffers for DOM frames), the code loops over `i` from 1 to `totalFrames - 1` and continuously checks `isDomStrategy` for every frame in the `for (; i < chunkEnd; i++)` inner loop:
```typescript
                let buf: any;
                if (isDomStrategy) {
                  // dom processing
                } else {
                  // canvas processing
                }
                // ... write logic
```
While PERF-995 plans to unroll the `isDomStrategy` checks for the initial frame processing in this path, the chunk loop itself (which handles the vast majority of frames) still contains the `if (isDomStrategy)` check on every iteration.

Because `isDomStrategy` is a boolean value that remains constant throughout the execution of the loop, V8 spends time parsing the branch and potentially failing branch prediction on it. By wrapping the chunk loop (`for (; i < chunkEnd; i++)`) in an outer `if (isDomStrategy)` check, we eliminate the condition from the hot path entirely. This isolates the monomorphic DOM processing from the monomorphic Canvas processing, which also eliminates V8 polymorphic inline caches (PICs) caused by mixing `Buffer.length` and `String.length` accesses during the stream writes.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas single-worker benchmarks
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `isDomStrategy` branch inside the `for (; i < chunkEnd; i++)` chunk loop is evaluated thousands of times redundantly per run. Mixing buffer types forces V8 to de-optimize the `length` property lookup on the buffers.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` out of the chunk loop in `!hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, find the chunk loop inside the `!hasProcessFn` block (around line 421):
```typescript
          let i = 1;
          while (i < totalFrames - 1 && !aborted) {
            const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

            for (; i < chunkEnd; i++) {
              // ...
```
Unroll it by pulling `if (isDomStrategy)` outside the `for` loop:
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
                const data = (rawResult as any).screenshotData;
                let buf: Buffer;
                if (data || !domLastFrameBuffer) {
                  if (data) domLastFrameData = data;
                  buf = Buffer.from((domLastFrameData || rawResult) as string, "base64");
                  domLastFrameBuffer = buf;
                } else {
                  buf = domLastFrameBuffer;
                }

                pendingBytes += buf.length;
                const writeSuccessStr = stream.write(buf);

                if (!writeSuccessStr && pendingBytes >= 16777216) {
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
                const buf = rawResult;

                pendingBytes += buf.length;
                const writeSuccessStr = stream.write(buf);

                if (!writeSuccessStr && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }
              }
            }

            if (aborted) break;

            if (i - 1 === nextProgress) {
              nextProgress += progressInterval;
              console.log(
                `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          }
```
*Note: In the `isDomStrategy` branch, `timePromise` can be removed as a local variable since it is not awaited.*

**Why**: Provides V8 with a guaranteed monomorphic type context inside the tight loop, avoiding inline cache misses for the `.length` property and avoiding redundant branch execution.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken, and run Vitest for both `verify-canvas-strategy` and `verify-dom-strategy-capture`.
