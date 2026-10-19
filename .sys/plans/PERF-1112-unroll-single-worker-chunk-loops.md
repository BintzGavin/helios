---
id: PERF-1112
slug: unroll-single-worker-chunk-loops
status: complete
claimed_by: "Jules"
created: 2024-10-19
completed: "2024-10-19"
result: "keep"
---

# PERF-1112: Unroll `isDomStrategy` Checks in Single-Worker Chunk Loops

## Focus Area
Single-worker `CaptureLoop` pathway (`packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
Currently, within the single-worker path's main frame processing loop (`let i = 1; while (i < totalFrames - 1 && !aborted)`), there are redundant checks for `if (isDomStrategy)` occurring on every single frame inside the tight chunked loop. Specifically, `isDomStrategy` is checked to select the `nextCapturePromise` evaluation and again to decode the buffer (`buf = domLastFrameBuffer!` vs `buf = rawResult`).
Since `isDomStrategy` is loop-invariant (it never changes during the capture of a single composition), we can hoist these branches entirely by creating two separate `while` loops—one dedicated exclusively to the `isDomStrategy === true` path and the other to the `false` path. This optimization shrinks the AST execution tree for the hot frame loop and removes thousands of branch evaluations, letting V8 TurboFan pipeline the single-path logic more efficiently.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.69s

## Implementation Spec

### Step 1: Unroll single-worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the single-worker loop chunk that starts with:
```typescript
        let i = 1;
        while (i < totalFrames - 1 && !aborted) {
```
Wrap this loop with an outer `if (isDomStrategy)` condition. Duplicate the loop logic inside both the `true` and `false` branches, removing the `isDomStrategy` checks inside the respective inner loops.

The `isDomStrategy === true` path should look like:
```typescript
        let i = 1;
        if (isDomStrategy) {
          while (i < totalFrames - 1 && !aborted) {
            const chunkEnd = Math.min(nextProgress, totalFrames - 1);

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = domBeginFrame!((i + 1) * timeStep);
              }

              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              const buf = domLastFrameBuffer!;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (i === nextProgress) {
              console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
              if (onProgress) onProgress(i / totalFrames);
              nextProgress = Math.min(nextProgress + progressInterval, totalFrames);
            }
          }
        } else {
```

The `isDomStrategy === false` path should look like:
```typescript
        } else {
          while (i < totalFrames - 1 && !aborted) {
            const chunkEnd = Math.min(nextProgress, totalFrames - 1);

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }

              const buf = rawResult;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (i === nextProgress) {
              console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
              if (onProgress) onProgress(i / totalFrames);
              nextProgress = Math.min(nextProgress + progressInterval, totalFrames);
            }
          }
        }
```

**Why**: By unrolling loop-invariant branches, we avoid running identical logic evaluations inside the inner hot loop block, helping the JS JIT optimize.

### Correctness Check
Run `npm run test -w packages/renderer` to ensure canvas and dom modes output frames correctly and gracefully exit.
