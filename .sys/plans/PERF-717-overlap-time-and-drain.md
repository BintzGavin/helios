---
id: PERF-717
slug: overlap-time-and-drain
status: complete
claimed_by: "executor-session"
created: 2024-06-09
completed: "2026-06-09"
result: "discarded"
---

# PERF-717: Overlap Time Progression with FFmpeg Drain

## Focus Area
`CaptureLoop.ts` fast path execution loop.

## Background Research
Currently in the single worker fast path:
```typescript
                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);

                // ... progress ...

                if (previousWritePromise) {
                    await previousWritePromise;
                    previousWritePromise = undefined;
                }
```
`timeDriver.setTime()` initiates an asynchronous CDP `Emulation.setVirtualTimePolicy` call to Chromium.
By immediately awaiting `setTimeResult`, Node.js blocks and yields back to the event loop, waiting for Chromium to finish rendering the frame.
Once Chromium finishes, Node.js then checks if FFmpeg requires a pipe drain (`previousWritePromise`), and if so, blocks AGAIN.

Since `timeDriver.setTime()` starts the Chromium rendering work, we can overlap this work with the Node.js FFmpeg pipe drain!

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-benchmark`
- **Render Settings**: 1920x1080, 60fps, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s (from previous experiments).
- **Bottleneck analysis**: Sequential stalling. We wait for Chromium, then we wait for FFmpeg, instead of waiting for both in parallel.

## Implementation Spec

### Step 1: Reorder `previousWritePromise` in CaptureLoop fast path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Move the `if (previousWritePromise)` block to immediately after `const setTimeResult = timeDriver.setTime(...)`, but before the `buffer` await sequence.

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

                if (previousWritePromise) {
                    await previousWritePromise;
                    previousWritePromise = undefined;
                }

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
>>>>>>> REPLACE
```

**Why**: By triggering `timeDriver.setTime()` (which initiates the asynchronous CDP call to Chromium) *before* awaiting the Node.js FFmpeg pipe drain (`previousWritePromise`), we overlap the Chromium rendering phase with the FFmpeg IO drain phase natively on a single thread. Chromium rendering continues asynchronously while Node.js blocks on the stream drain.
**Risk**: If `previousWritePromise` takes longer to resolve than Chromium takes to render, the `setTime` CDP command will resolve and budget will expire, which means the `Emulation.virtualTimeBudgetExpired` CDP event will fire while Node.js is still waiting on the stream. Playwright buffers incoming CDP events so this is completely safe.

## Canvas Smoke Test
`npm run test -w packages/renderer` - verify no breakages.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npm run build && npx tsx scripts/benchmark-perf.ts` and verify output.

## Results Summary
- **Best render time**: ~2.489s (vs baseline ~2.115s)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-717]
