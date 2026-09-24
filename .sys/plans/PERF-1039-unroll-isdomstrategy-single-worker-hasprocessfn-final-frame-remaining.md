---
id: PERF-1039
slug: unroll-isdomstrategy-single-worker-hasprocessfn-final-frame-remaining
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1039: Unroll isDomStrategy in single-worker !hasProcessFn final frame

## Focus Area
The single worker `!hasProcessFn` path's final frame evaluation in `CaptureLoop.ts` (around lines 565-600).

## Background Research
In earlier PERF plans, we duplicated the main chunking loop `while (i < totalFrames - 1 && !aborted)` inside both the `hasProcessFn` true and false branches by unrolling the `isDomStrategy` check.

However, the logic immediately *following* the chunking loop, specifically:
```typescript
            if (!aborted && totalFrames > 1) {
              const rawResult = await nextCapturePromise;

              let buf: any;
              if (isDomStrategy) {
                // ...
              } else {
                // ...
              }
            }
```
Still contains an inner `isDomStrategy` branch within the `!hasProcessFn` path (the single-worker loop block, near lines 565-600) and possibly `hasProcessFn` if it wasn't fully caught by previous PERFs.

By hoisting `if (!aborted && totalFrames > 1)` into the previously unrolled `if (isDomStrategy)` blocks in the `!hasProcessFn` code path, we can completely eliminate this dynamic branch evaluation at runtime, reducing the JIT bailout risk at the end of the capture loop.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant `isDomStrategy` check adds branch parser instructions in the single-worker final frame setup.

## Implementation Spec

### Step 1: Hoist `!aborted && totalFrames > 1` logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the single-worker loop for `!hasProcessFn` (starts around line 400 with `} else {` of the `if (hasProcessFn)` check).
Inside that, there is an `if (isDomStrategy)` block that was previously unrolled.

Currently it looks roughly like:
```typescript
            if (isDomStrategy) {
              while (i < totalFrames - 1 && !aborted) {
                // chunk end logic for dom
              }
            } else {
              while (i < totalFrames - 1 && !aborted) {
                // chunk end logic for canvas
              }
            }

            if (!aborted && totalFrames > 1) {
              const rawResult = await nextCapturePromise;

              let buf: any;
              if (isDomStrategy) {
                // dom logic
              } else {
                // canvas logic
              }
              // write
            }
```

Change it to:
```typescript
            if (isDomStrategy) {
              while (i < totalFrames - 1 && !aborted) {
                // chunk end logic for dom
              }

              if (!aborted && totalFrames > 1) {
                const rawResult = await nextCapturePromise;
                let buf: any;
                const data = (rawResult as any).screenshotData;
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

                i++;
                if (i - 1 === nextProgress || i === totalFrames) {
                  if (i - 1 === nextProgress) nextProgress += progressInterval;
                  console.log(
                    `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                  );
                  if (onProgress) {
                    onProgress((i - 1) / totalFrames);
                  }
                }
              }
            } else {
              while (i < totalFrames - 1 && !aborted) {
                // chunk end logic for canvas
              }

              if (!aborted && totalFrames > 1) {
                const rawResult = await nextCapturePromise;
                let buf: any;
                buf = rawResult; // because !hasProcessFn

                pendingBytes += buf.length;
                const writeSuccess = stream.write(buf);

                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                i++;
                if (i - 1 === nextProgress || i === totalFrames) {
                  if (i - 1 === nextProgress) nextProgress += progressInterval;
                  console.log(
                    `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                  );
                  if (onProgress) {
                    onProgress((i - 1) / totalFrames);
                  }
                }
              }
            }
```
*Note: Make sure to check the exact `hasProcessFn` vs `!hasProcessFn` path blocks. In `!hasProcessFn`, `buf` is typically just `rawResult`.*

## Variations
- Check if similar logic needs to be hoisted in `hasProcessFn` path if it hasn't been completely handled by PERF-1033. (The prompt memory mentions PERF-1032 and PERF-1033 unrolled some of these final blocks, so double-check the code to find any remaining `isDomStrategy` inner branches).

## Correctness Check
Run general tests: `npm run test -w packages/renderer`.
