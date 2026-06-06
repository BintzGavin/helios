---
id: PERF-688
slug: pipeline-overlap-single-worker
status: complete
claimed_by: "agent"
created: 2024-05-24
completed: "2026-06-06"
result: "discarded"
---

# PERF-688: Pipeline Capture and FFmpeg Drain in Single Worker Fast Path

## Focus Area
Single-Worker Fast Path Pipeline Overlap (`CaptureLoop.ts`). This targets the single highest-leverage bottleneck in the newly introduced sequential fast path: the lack of parallelization between Chromium rendering and FFmpeg stream draining.

## Background Research
In PERF-683, a single-worker fast path was introduced that successfully reduced V8 context-switching overhead by bypassing the Actor Model ring buffer. However, this path made the execution strictly sequential:
1. Advance virtual time and await frame capture (Chromium works, Node waits).
2. Await `previousWritePromise` to let the FFmpeg `stdin` stream drain (Node waits for I/O, Chromium is completely idle).
3. Write the buffer.

Because 1080p base64 frames (~266KB) consistently exceed the Node.js pipe `highWaterMark` (64KB), `stdin.write` almost always returns `false`, meaning `previousWritePromise` is awaited on nearly every frame. By deferring the `await` on the capture promise until *after* the drain wait, we can overlap the I/O bottleneck with the Chromium rendering bottleneck, effectively restoring a double-buffer pipeline without multi-worker overhead.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/dom-benchmark.html
- **Render Settings**: 1080p, 60fps, 10s (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.18s (best ~2.05s)
- **Bottleneck analysis**: The single-worker loop stalls Chromium while waiting for FFmpeg stream drainage.

## Implementation Spec

### Step 1: Overlap Capture with FFmpeg Drain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `if (poolLen === 1)` fast path, extract the capture promise and defer its `await` until after `previousWritePromise` is resolved. Use the existing `noopCatch` to suppress unhandled rejection warnings during the overlapped wait.

```typescript
<<<<<<< SEARCH
                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);

                if (i === nextProgressFrame) {
                    console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                    nextProgressFrame += progressInterval;
                }

                if (onProgress) {
                    onProgress(i / totalFrames);
                }

                if (previousWritePromise) {
                    await previousWritePromise;
                    previousWritePromise = undefined;
                }
=======
                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const capturePromise = setTimeResult
                    ? setTimeResult.then(() => strategy.capture(page, time))
                    : strategy.capture(page, time);

                capturePromise.catch(noopCatch);

                if (previousWritePromise) {
                    await previousWritePromise;
                    previousWritePromise = undefined;
                }

                const buffer = await capturePromise;

                if (i === nextProgressFrame) {
                    console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                    nextProgressFrame += progressInterval;
                }

                if (onProgress) {
                    onProgress(i / totalFrames);
                }
>>>>>>> REPLACE
```
**Why**: This starts the capture process (triggering Chromium to render the next frame) and *then* blocks Node.js to wait for FFmpeg to drain the previous frame. By the time FFmpeg drains, Chromium has likely finished rendering the frame, hiding the I/O latency entirely.
**Risk**: Minor memory increase due to 1 frame being buffered in flight, which is perfectly safe and expected in a pipelined architecture.

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors break the Canvas path.

## Correctness Check
Run the DOM benchmark (`npx tsx scripts/benchmark-perf.ts`) and ensure output videos render correctly.

## Prior Art
- PERF-683: Introduced the fast path but made it strictly sequential.
- PERF-684: Separated awaits but did not overlap with `previousWritePromise`, causing a regression due to broken `.then()` microtask chains. This plan preserves the inline `.then()` chain while adding the overlap.
