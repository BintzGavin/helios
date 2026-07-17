---
id: PERF-1033
slug: unroll-isdomstrategy-single-worker-hasprocessfn-final-frame
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1033: Unroll `isDomStrategy` check in single-worker `hasProcessFn` final frame block

## Focus Area
The single-worker final frame logic inside the `hasProcessFn` path of `packages/renderer/src/core/CaptureLoop.ts` (around lines 360-400).

## Background Research
The `CaptureLoop.ts` file splits its processing into chunks, but peels the final frame to avoid an extra branch check inside the hot loop. In the `hasProcessFn` single-worker loop (which handles processing frame result), the peeled final frame processing logic is:
```typescript
            if (!aborted && totalFrames > 1) {
              const rawResult = await nextCapturePromise;

              let buf: any;
              if (isDomStrategy) {
                const data = rawResult.screenshotData;
                if (data) {
                  domLastFrameData = data;
                  buf = Buffer.from(data as string, "base64");
                  domLastFrameBuffer = buf;
                } else {
                  buf = domLastFrameBuffer!;
                }
              } else {
                buf = strategy.processCaptureResult!(rawResult);
              }
              // ... stream write ...
            }
```
Because the `isDomStrategy` loop was successfully unrolled for the chunk loop earlier in this block (via PERF-1028), this final block now re-introduces the `isDomStrategy` branch check.
Since `isDomStrategy` is a constant known ahead of time, we can wrap the final frame check `if (!aborted && totalFrames > 1)` entirely inside an `if (isDomStrategy) { ... } else { ... }` block to completely eliminate the dynamic check. This simplifies the V8 AST representation and maintains strict monomorphism for the final frame encoding logic. This complements the previous PERF-1032 which optimized the `!hasProcessFn` path.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant `isDomStrategy` branch evaluation for the peeled final frame execution in the single-worker `hasProcessFn` path.

## Implementation Spec

### Step 1: Unroll `isDomStrategy` in final frame block for `hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `hasProcessFn` path (around line 362), locate the block:
```typescript
            if (!aborted && totalFrames > 1) {
              const rawResult = await nextCapturePromise;

              let buf: any;
              if (isDomStrategy) {
                // ...
```
Change it to:
```typescript
            if (!aborted && totalFrames > 1) {
              if (isDomStrategy) {
                const rawResult = await nextCapturePromise;
                let buf: any;
                const data = rawResult.screenshotData;
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
              } else {
                const rawResult = await nextCapturePromise;
                let buf: any;
                buf = strategy.processCaptureResult!(rawResult);

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
**Why**: Eliminates a redundant `if` evaluation and allows the JIT engine to maintain monomorphic buffers inside the respective final frame paths.

## Canvas Smoke Test
Run Canvas smoke test: `npm run build -w packages/core && npx tsx packages/renderer/tests/verify-canvas-strategy.ts`

## Correctness Check
Run DOM smoke test: `npm run build -w packages/core && npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`

## Prior Art
- PERF-1032 unrolled the `!hasProcessFn` path's final frame check.
- PERF-1029 successfully unrolled similar initial blocks.
- PERF-1028 successfully unrolled chunk loops.
