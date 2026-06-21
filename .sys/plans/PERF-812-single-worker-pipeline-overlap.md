---
id: PERF-812
slug: single-worker-pipeline-overlap
status: unclaimed
claimed_by: ""
created: 2024-06-21
completed: ""
result: ""
---

# PERF-812: Single-Worker Pipeline Overlap (1-Frame Lookahead)

## Focus Area
`CaptureLoop.ts` fast paths (single worker loop).

## Background Research
Currently, the single-worker capture loop is strictly sequential:
1. `await timeDriver.setTime()` (advance virtual time)
2. `await strategy.capture()` (tell Chromium to render and send frame via CDP)
3. Decode Base64 string to Buffer
4. `stream.write()` to FFmpeg stdin
5. If backpressure, `await drainPromise`

Chromium sits completely idle during steps 3, 4, and 5. Base64 decoding is CPU-intensive in Node.js. By eagerly firing the *next* frame's CDP capture command *before* decoding and writing the *current* frame, Chromium can render frame N+1 concurrently while Node.js decodes and writes frame N. This provides a 1-frame pipelining benefit without the massive IPC/Promise overhead of the multi-worker actor model.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s
- **Bottleneck analysis**: Node.js CPU time spent decoding Base64 blocks the next CDP frame capture command from being sent, causing Chromium to idle.

## Implementation Spec

### Step 1: 1-Frame Lookahead Pipeline
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `if (hasProcessFn)` block around line 169:

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

Repeat this same change for the `else` block (the non-`hasProcessFn` path):
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

**Why**: By triggering `strategy.capture(page, (i+1)*timeStep)` *before* processing the buffer for frame `i`, Chromium begins rendering the next frame in the background via CDP, perfectly overlapping with the CPU-bound Node.js tasks (Base64 decode, stream.write, and progress console logging).

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to verify `canvas` mode still correctly captures the expected number of frames without hanging.

## Correctness Check
Run the `dom` mode benchmark `npx tsx scripts/benchmark-perf.ts --mode dom`. Ensure frames are captured completely and progress ticks normally.

## Prior Art
- PERF-686 tried a 1-frame overlap with the FFmpeg drain `previousWritePromise`, but holding the write promise and overlapping the `await` there disrupted the microtask queue significantly causing pipeline stalls. This plan overlaps the *CDP request* with the *synchronous CPU work* inside the same synchronous block, without trying to delay the backpressure stream checks, which avoids pipeline stalls entirely.
