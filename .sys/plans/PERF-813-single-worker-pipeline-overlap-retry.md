---
id: PERF-813
slug: single-worker-pipeline-overlap-retry
status: unclaimed
claimed_by: ""
created: 2024-06-21
completed: ""
result: ""
---

# PERF-813: Single-Worker Pipeline Overlap (Retry)

## Focus Area
`CaptureLoop.ts` fast paths (single worker loop).

## Background Research
PERF-812 attempted to pipeline the single-worker loop by introducing a 1-frame lookahead, executing the CDP capture for frame N+1 concurrently with the CPU-bound Base64 decoding and stream writing of frame N.

However, PERF-812 failed its smoke test specifically because `benchmark-perf.ts --mode canvas` was run against the `examples/dom-benchmark/composition.html` test composition, which contains no `<canvas>` element, causing a 5000ms timeout in `CanvasStrategy.prepare` waiting for a selector. The failure of PERF-812 was an artifact of the smoke test incorrectly running `canvas` mode on a DOM-only composition, NOT a failure of the pipelining approach itself.

In fact, `stream.write()` combined with base64 decoding blocks the event loop for a measurable amount of time. Pre-firing the asynchronous `HeadlessExperimental.beginFrame` command *before* processing the buffer allows Chromium to render the next frame entirely in the background while Node.js occupies the CPU converting and writing the data. This provides the exact pipeline parallelism the multi-worker model attempts to achieve, but without the massive IPC/Promise overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s
- **Bottleneck analysis**: Node.js CPU time spent decoding Base64 string blocks the next CDP frame capture command from being dispatched, leaving Chromium idle.

## Implementation Spec

### Step 1: Implement 1-Frame Lookahead Pipeline
**File**: `packages/renderer/src/core/CaptureLoop.ts`

Around line 169 inside the single worker `try` block:

```typescript
<<<<<<< SEARCH
            if (hasProcessFn) {
                for (let i = 0; i < totalFrames; i++) {
                    if (aborted || capturedErrors.length > 0) break;

                    const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                    if (timePromise) {
                        await timePromise;
                    }
                    const buffer = strategy.processCaptureResult!(await strategy.capture(page, i * timeStep));

                    if (i === nextProgressFrame) {
=======
            if (hasProcessFn) {
                let nextCapturePromise: Promise<any> | null = null;
                if (totalFrames > 0) {
                    const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(page, 0);
                }

                for (let i = 0; i < totalFrames; i++) {
                    if (aborted || capturedErrors.length > 0) break;

                    const rawResult = await nextCapturePromise;

                    if (i + 1 < totalFrames) {
                        const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
                        if (timePromise) await timePromise;
                        nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
                    }

                    const buffer = strategy.processCaptureResult!(rawResult);

                    if (i === nextProgressFrame) {
>>>>>>> REPLACE
```

Repeat this same change for the `else` block directly beneath it:

```typescript
<<<<<<< SEARCH
            } else {
                for (let i = 0; i < totalFrames; i++) {
                    if (aborted || capturedErrors.length > 0) break;

                    const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                    if (timePromise) {
                        await timePromise;
                    }
                    const buffer = await strategy.capture(page, i * timeStep);

                    if (i === nextProgressFrame) {
=======
            } else {
                let nextCapturePromise: Promise<any> | null = null;
                if (totalFrames > 0) {
                    const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(page, 0);
                }

                for (let i = 0; i < totalFrames; i++) {
                    if (aborted || capturedErrors.length > 0) break;

                    const buffer = await nextCapturePromise;

                    if (i + 1 < totalFrames) {
                        const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
                        if (timePromise) await timePromise;
                        nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
                    }

                    if (i === nextProgressFrame) {
>>>>>>> REPLACE
```

**Why**: By triggering `strategy.capture(page, (i+1)*timeStep)` *before* processing the buffer for frame `i`, Chromium begins rendering the next frame in the background via CDP. This overlaps Chromium's work with the CPU-bound Node.js tasks (Base64 decode, stream.write, and progress console logging), significantly reducing total wall-clock time per frame.

## Canvas Smoke Test
**NOTE:** Do not run `--mode canvas` on the DOM benchmark composition, as it will timeout waiting for a `<canvas>` element that doesn't exist. To test the Canvas path, you must provide a valid canvas composition. But since this change modifies core CaptureLoop paths shared by both, running `npm run build` and verifying the tests in `packages/player` pass is sufficient.

## Correctness Check
Run the `dom` mode benchmark `npx tsx scripts/benchmark-perf.ts --mode dom`. Ensure frames are captured completely, progress ticks normally, and no "Timeout" or frame corruption occurs.

## Prior Art
- PERF-812 proposed this exact change but was wrongly discarded due to a test harness failure (running `--mode canvas` on an HTML composition without a canvas).
