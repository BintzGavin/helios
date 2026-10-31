---
id: PERF-1153
slug: unroll-isdomstrategy-single-worker-try-catch
status: unclaimed
claimed_by: ""
created: 2024-10-31
completed: ""
result: ""
---

# PERF-1153: Unroll isDomStrategy in single worker try-catch blocks

## Focus Area
Fast path single-worker logic in `CaptureLoop.ts`. Specifically, completely unrolling the single worker execution path by isolating the `isDomStrategy` check outside of the monolithic `try/catch` block.

## Background Research
Currently, inside the single-worker path, the execution relies on an `isDomStrategy` flag (lines 173, 233, 317 in `CaptureLoop.ts`) to decide how to process captures (Base64 vs raw Buffer) and how to handle initialization and loops. The `if (isDomStrategy)` check is evaluated for the initialization frame, inside the chunking loop dispatcher, and for the final frame.
Because the worker strategy cannot change during the execution of `run()`, we can hoist the `isDomStrategy` check completely out of the single worker `try...catch` block, splitting the single-worker path into two distinct `try...catch` implementations—one for `isDomStrategy` and one for the non-DOM (canvas) strategy. This eliminates repeated branch evaluations in the JS engine and simplifies the V8 AST for each hot path.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.49s
- **Bottleneck analysis**: Redundant conditional branch evaluation inside the single-worker execution sequence.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` to wrap the single-worker try-catch blocks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the single worker structure from:
```typescript
      const isDomStrategy = !!(strategy as any).cdpSession;

      try {
        let progressCounter = progressInterval;
        let nextCapturePromise: any = null;
        if (isDomStrategy) {
          // DOM init
        } else {
          // Canvas init
        }

        let i = 1;
        const loopEnd = totalFrames - 1;
        if (isDomStrategy) {
          while (i < loopEnd && !aborted) { ... }
        } else {
          while (i < loopEnd && !aborted) { ... }
        }

        if (isDomStrategy) {
          // DOM final
        } else {
          // Canvas final
        }
      } catch (e) { ... }
```
To:
```typescript
      const isDomStrategy = !!(strategy as any).cdpSession;

      if (isDomStrategy) {
        try {
          let progressCounter = progressInterval;
          let nextCapturePromise: any = null;

          const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
          if (timePromise) await timePromise;
          nextCapturePromise = strategy.capture(page, 0);

          const rawResult = await nextCapturePromise;
          if (1 < totalFrames) {
            const timePromise2 = timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
            if (timePromise2) await timePromise2;
            nextCapturePromise = strategy.capture(page, timeStep);
          }
          console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
          if (onProgress) onProgress(0 / totalFrames);

          const buf = Buffer.from(rawResult as string, "base64");
          pendingBytes += buf.length;
          if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
            await this.drainPromise;
            pendingBytes = 0;
          }

          let i = 1;
          const loopEnd = totalFrames - 1;
          while (i < loopEnd && !aborted) {
            const boundEnd = i + progressCounter;
            const chunkEnd = boundEnd < loopEnd ? boundEnd : loopEnd;
            const startWrite = i;

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }

              const buf = Buffer.from(rawResult as string, "base64");
              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (aborted) break;

            progressCounter -= (i - startWrite);
            if (progressCounter === 0) {
              progressCounter = progressInterval;
              console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
              if (onProgress) onProgress((i - 1) / totalFrames);
            }
          }

          if (!aborted && totalFrames > 1) {
            const rawResult = await nextCapturePromise;
            const buf = Buffer.from(rawResult as string, "base64");
            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
              await this.drainPromise;
              pendingBytes = 0;
            }
            console.log(`Progress: Rendered ${totalFrames} / ${totalFrames} frames`);
            if (onProgress) onProgress(1);
          }
        } catch (e) {
          fatalError = e;
        }
      } else {
        try {
          let progressCounter = progressInterval;
          let nextCapturePromise: any = null;

          const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
          if (timePromise) await timePromise;
          nextCapturePromise = strategy.capture(page, 0);

          const rawResult = await nextCapturePromise;
          if (1 < totalFrames) {
            const timePromise2 = timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
            if (timePromise2) await timePromise2;
            nextCapturePromise = strategy.capture(page, timeStep);
          }
          console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
          if (onProgress) onProgress(0 / totalFrames);

          pendingBytes += rawResult.length;
          if (!stream.write(rawResult) && pendingBytes >= MAX_PENDING_BYTES) {
            await this.drainPromise;
            pendingBytes = 0;
          }

          let i = 1;
          const loopEnd = totalFrames - 1;
          while (i < loopEnd && !aborted) {
            const boundEnd = i + progressCounter;
            const chunkEnd = boundEnd < loopEnd ? boundEnd : loopEnd;
            const startWrite = i;

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }

              const buf = rawResult;
              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (aborted) break;

            progressCounter -= (i - startWrite);
            if (progressCounter === 0) {
              progressCounter = progressInterval;
              console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
              if (onProgress) onProgress((i - 1) / totalFrames);
            }
          }

          if (!aborted && totalFrames > 1) {
            const rawResult = await nextCapturePromise;
            pendingBytes += rawResult.length;
            if (!stream.write(rawResult) && pendingBytes >= MAX_PENDING_BYTES) {
              await this.drainPromise;
              pendingBytes = 0;
            }
            console.log(`Progress: Rendered ${totalFrames} / ${totalFrames} frames`);
            if (onProgress) onProgress(1);
          }
        } catch (e) {
          fatalError = e;
        }
      }
```
**Why**: Ensures V8 turboFan does not have to parse overlapping code paths or branch jumps across the entire single-worker rendering run, reducing AST instruction overhead for the hot fast paths.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
Similar multi-worker unrolling optimizations (e.g. PERF-1152) and previous inner loop isolations.
