---
id: PERF-1158
slug: extract-fast-path-decode
status: unclaimed
claimed_by: ""
created: 2024-11-01
completed: ""
result: ""
---

# PERF-1158: Extract fast path decode logic to simplify AST single worker path

## Focus Area
The single-worker fast path inside `CaptureLoop.ts` initialization block (line 164-374).

## Background Research
Currently in `CaptureLoop.ts`, in the single-worker fast path, there is a large check `const isDomStrategy = !!(strategy as any).cdpSession;` followed by `if (isDomStrategy) { ... } else { ... }`.
This check was added by PERF-1156 to branch the code based on the strategy type because DOM strategy needs base64 buffer conversion (since Playwright returns base64 strings for DOM capture) while Canvas returns buffers directly.
While unrolling was a valid hypothesis, the duplication is massive and balloons the size of the JavaScript parsed by V8 (AST bloat). The logic across both branches is nearly identical, except for the single line converting `rawResult` into `buf`.
By refactoring this block to use a single loop and moving the buffer resolution logic into a small, fast inline ternary expression (`const buf = isDomStrategy ? Buffer.from(rawResult as string, "base64") : rawResult as Buffer;`), we can merge the two massive identical blocks back into one. This drastically reduces AST parsing overhead, improves CPU I-cache density, and allows V8 TurboFan to optimize the hot single-worker execution path without code duplication bloat. (A direct inline ternary is preferred over closure to prevent closure allocation per iteration).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.608s (from PERF-1156)
- **Bottleneck analysis**: Massive duplicated loop body in JS AST parsing and instruction cache overhead for V8 TurboFan in single-worker path.

## Implementation Spec

### Step 1: Replace duplicated block with strategy-agnostic resolver
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the `if (isDomStrategy)` branch entirely and combine the two identical `try { ... }` blocks into one. In the unified block, replace the specific buffer decoding:
```typescript
      const isDomStrategy = !!(strategy as any).cdpSession;

      try {
        let progressCounter = progressInterval;
        let nextCapturePromise: any = null;

        const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
        if (timePromise) await timePromise;
        nextCapturePromise = strategy.capture(page, 0);

        const rawResult = await nextCapturePromise;
        if (1 < totalFrames) {
          const timePromise = timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
          if (timePromise) await timePromise;
          nextCapturePromise = strategy.capture(page, timeStep);
        }
        console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
        if (onProgress) {
          onProgress(0 / totalFrames);
        }

        const buf = isDomStrategy ? Buffer.from(rawResult as string, "base64") : rawResult as Buffer;

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

            const buf = isDomStrategy ? Buffer.from(rawResult as string, "base64") : rawResult as Buffer;

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
            if (onProgress) {
              onProgress((i - 1) / totalFrames);
            }
          }
        }

        if (!aborted && totalFrames > 1) {
          const rawResult = await nextCapturePromise;

          const buf = isDomStrategy ? Buffer.from(rawResult as string, "base64") : rawResult as Buffer;

          pendingBytes += buf.length;
          if (!stream.write(buf) && pendingBytes >= MAX_PENDING_BYTES) {
            await this.drainPromise;
            pendingBytes = 0;
          }

          i++;
          progressCounter = progressInterval;
          console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
          if (onProgress) {
            onProgress((i - 1) / totalFrames);
          }
        }

      } catch (e) {
        fatalError = e;
      } finally {
        if (signal && abortListener) {
          signal.removeEventListener("abort", abortListener);
        }
      }
```
**Why**: Shrinks the V8 AST payload by 50% for this hot path, enabling better instruction caching in the CPU, while keeping the dynamic dispatch fast and inline.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
Re-merging similar single worker paths for size efficiency.
