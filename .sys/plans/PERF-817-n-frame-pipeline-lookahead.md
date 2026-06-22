---
id: PERF-817
slug: n-frame-pipeline-lookahead
status: complete
claimed_by: "executor-session"
created: 2024-06-22
completed: "2026-06-22"
result: "failed"
---

# PERF-817: N-Frame Pipeline Lookahead (Deep Overlap)

## Focus Area
`CaptureLoop.ts` fast paths (single worker loop).

## Background Research
PERF-814 introduced a 1-frame lookahead, which successfully overlapped Chromium's execution of frame N+1 with Node.js processing frame N. However, because CDP messages (like `HeadlessExperimental.beginFrame` and its Base64 response) are transferred over a WebSocket, there is still inherent IPC latency.
With a 1-frame lookahead, when Node.js finishes processing frame N, it waits for frame N+1. Once frame N+1 arrives, Node.js immediately requests frame N+2. During the time it takes for frame N+1's response to reach Node.js and the request for N+2 to reach Chromium, Chromium sits idle. For a 150-frame render, this IPC roundtrip time accumulates into significant idle time.
By increasing the pipeline depth (lookahead) to 3 or 4 frames, we ensure that Chromium's CDP command queue always has the next frame request ready before it finishes the current one. This completely eliminates IPC latency gaps, allowing Chromium to render frames back-to-back at maximum CPU utilization.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: IPC roundtrip latency between Node.js receiving a frame and dispatching the CDP command for the next frame leaves Chromium periodically idle.

## Implementation Spec

### Step 1: Implement N-Frame Lookahead Pipeline
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker fast path, replace the 1-frame lookahead logic (the `let nextCapturePromise = null;` blocks) with an N-frame pipeline using an array. Apply this to both the `if (hasProcessFn)` and `else` branches.

Example for `if (hasProcessFn)`:
```typescript
<<<<<<< SEARCH
                let nextCapturePromise = null;
                if (totalFrames > 0) {
                    const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
                    if (timePromise) {
                        await timePromise;
                    }
                    nextCapturePromise = strategy.capture(page, 0);
                }
                for (let i = 0; i < totalFrames; i++) {
                    if (aborted) break;

                    const rawResult = await nextCapturePromise;

                    if (i + 1 < totalFrames) {
                        const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
                        if (timePromise) {
                            await timePromise;
                        }
                        nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
                    }

                    const buffer = strategy.processCaptureResult!(rawResult);
=======
                const LOOKAHEAD = 4;
                const pipeline: Promise<any>[] = [];

                for (let i = 0; i < Math.min(LOOKAHEAD, totalFrames); i++) {
                    if (aborted) break;
                    const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                    if (timePromise) {
                        await timePromise;
                    }
                    pipeline.push(strategy.capture(page, i * timeStep));
                }

                for (let i = 0; i < totalFrames; i++) {
                    if (aborted) break;

                    const rawResult = await pipeline.shift();

                    const nextFrame = i + LOOKAHEAD;
                    if (nextFrame < totalFrames) {
                        const timePromise = timeDriver.setTime(page, (startFrame + nextFrame) * compTimeStep);
                        if (timePromise) {
                            await timePromise;
                        }
                        pipeline.push(strategy.capture(page, nextFrame * timeStep));
                    }

                    const buffer = strategy.processCaptureResult!(rawResult);
>>>>>>> REPLACE
```

Apply the exact same logic structure to the `else` block (where `buffer = await pipeline.shift();`).

**Why**: Queuing 4 frames in flight ensures the Chromium CDP queue never drains empty, completely masking the Node.js WebSocket communication overhead.

## Variations
- **Variation A**: Increase `LOOKAHEAD` to 8 if 4 doesn't fully saturate the CPU.

## Canvas Smoke Test
Run `npm run build` and ensure the `packages/player` tests pass to verify `canvas` mode is not broken.

## Correctness Check
Run the `dom` mode benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts --mode dom`). Ensure progress reporting is still emitted sequentially and the output video correctly captures all frames without skipping or corrupting.


## Results Summary
- **Best render time**: N/A (crash)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [N-frame pipeline lookahead]
