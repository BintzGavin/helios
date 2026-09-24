---
id: PERF-1016
slug: consolidate-is-dom-strategy-initial-no-process-fn
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1016: Consolidate `isDomStrategy` branches in single-worker initial frame loop (`!hasProcessFn`)

## Focus Area
The single-worker fast path initialization logic in `packages/renderer/src/core/CaptureLoop.ts` (around lines 365-420) for the `!hasProcessFn` branch.

## Background Research
When a single worker renders the composition in the `!hasProcessFn` block, the loop primes the 0th and 1st frames before entering a fast while-loop that iterates the remainder. During this initialization, the `isDomStrategy` boolean is checked sequentially inside multiple `if` blocks (one for `totalFrames > 0` priming, one for resolving that frame and priming the next).

Evaluating `isDomStrategy` multiple times sequentially creates redundant parsing and branching instructions in V8's hot path AST.

We can optimize this by hoisting the `isDomStrategy` check out to wrap the entire `if (totalFrames > 0)` initialization sequence. This fully decouples the initial frame processing logic into two parallel, contiguous blocks (one strictly for DOM, one strictly for Canvas), preventing interleaved condition evaluations.

This mirrors PERF-998 (which unrolled the `isDomStrategy` check for the single-worker `hasProcessFn` path) and was previously intended to be done in PERF-995 (but PERF-995 is still unclaimed and likely discarded or deferred). Doing this completes the structural optimization for single-worker frame priming.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `isDomStrategy` check is executed 3 distinct times sequentially during the first frame priming, leading to AST bloat and extra evaluation branches during setup.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` out of the initial frame capture logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, find the `} else {` block corresponding to `!hasProcessFn` (starting around line 365).
Currently, the initialization uses:
```typescript
          let nextCapturePromise: any = null;
          if (totalFrames > 0) {
            const timePromise = timeDriver.setTime(
              page,
              startFrame * compTimeStep,
            );
            if (isDomStrategy) {
              nextCapturePromise = domBeginFrame!();
            } else {
              if (timePromise) await timePromise;
              nextCapturePromise = strategy.capture(page, 0);
            }
          }

          if (totalFrames > 0) {
            const rawResult = await nextCapturePromise;

            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );
              if (isDomStrategy) {
                nextCapturePromise = domBeginFrame!();
              } else {
                if (timePromise) await timePromise;
                nextCapturePromise = strategy.capture(page, timeStep);
              }
            }
            console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
            if (onProgress) onProgress(0 / totalFrames);

            let buf: any;
            if (isDomStrategy) {
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameData = data;
              }
              if (data || !domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from((data || rawResult) as string, "base64");
              }
              buf = domLastFrameBuffer;
            } else {
              buf = rawResult;
            }

            pendingBytes += buf.length;
            const writeSuccess = stream.write(buf);

            if (!writeSuccess && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
          }
```

Refactor it to hoist the `isDomStrategy` condition up:
```typescript
          let nextCapturePromise: any = null;
          if (isDomStrategy) {
            if (totalFrames > 0) {
              timeDriver.setTime(page, startFrame * compTimeStep);
              nextCapturePromise = domBeginFrame!();
            }

            if (totalFrames > 0) {
              const rawResult = await nextCapturePromise;

              if (1 < totalFrames) {
                timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
                nextCapturePromise = domBeginFrame!();
              }
              console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
              if (onProgress) onProgress(0 / totalFrames);

              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameData = data;
              }
              if (data || !domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from((data || rawResult) as string, "base64");
              }
              const buf = domLastFrameBuffer;

              pendingBytes += buf.length;
              const writeSuccess = stream.write(buf);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }
          } else {
            if (totalFrames > 0) {
              const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
              if (timePromise) await timePromise;
              nextCapturePromise = strategy.capture(page, 0);
            }

            if (totalFrames > 0) {
              const rawResult = await nextCapturePromise;

              if (1 < totalFrames) {
                const timePromise = timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
                if (timePromise) await timePromise;
                nextCapturePromise = strategy.capture(page, timeStep);
              }
              console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
              if (onProgress) onProgress(0 / totalFrames);

              const buf = rawResult;

              pendingBytes += (buf as any).length;
              const writeSuccess = stream.write(buf as any);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }
          }
```

**Why**: Isolates the DOM path from the Canvas path during frame setup, avoiding redundant V8 JIT branch analysis and evaluation overhead, establishing a strictly monomorphic execution context right from frame 0.

## Canvas Smoke Test
Run `npm run build -w packages/core` then `npm run test -w packages/renderer verify-canvas-strategy.ts` to ensure the Canvas strategy path works.

## Correctness Check
Run `npm run build -w packages/core` then `npm run test -w packages/renderer verify-dom-strategy-capture.ts` to ensure the DOM path is still functioning correctly. Run `npm run test -w packages/renderer` to ensure nothing is broken.

## Prior Art
- PERF-998: Isolating block-level evaluations in the `hasProcessFn` path initialization.
- PERF-1009/1010: Similar chunk-level loop isolation methodologies.
