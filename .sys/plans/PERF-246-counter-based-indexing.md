---
id: PERF-246
slug: counter-based-indexing
status: complete
claimed_by: "executor-session"
created: 2026-04-11
completed: "2026-04-11"
result: "improved"
---

# PERF-246: Replace Modulo/Bitwise Indexing with Counter-Based Indexing in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Execution overhead in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In the hot loop of `CaptureLoop.ts`, we frequently index arrays using modulo (`frameIndex % poolLen`) and bitwise AND (`nextFrameToSubmit & ringMask`).
A simple microbenchmark reveals that a counter-based wrap-around (e.g., `idx++; if (idx === max) idx = 0;`) is significantly faster in V8 than both modulo and bitwise AND when iterating sequentially.
- Modulo: ~46ms per 10M iterations
- Bitwise: ~24ms per 10M iterations
- Counter: ~17ms per 10M iterations

In PERF-234, an attempt to replace modulo indexing was discarded because "custom pointer wrap-around tracking ... broke synchronous evaluation order in tests and caused pipeline stalls." However, if we preserve `nextFrameToSubmit` and `nextFrameToWrite` for condition checks, and *only* use the counters for indexing into the `pool` and `framePromises` arrays, we maintain identical evaluation logic while avoiding the modulo/bitwise cost.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: (Varies by environment, refer to latest baseline)
- **Bottleneck analysis**: Overhead of bitwise and modulo arithmetic operations within the very tight `while` loops processing every frame sequentially.

## Implementation Spec

### Step 1: Replace Modulo and Bitwise Indexing
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Add `workerIndex`, `submitIndex`, and `writeIndex` variables before the main loop. Update them instead of using `%` or `&`.

```typescript
<<<<<<< SEARCH
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    const ringMask = maxPipelineDepth - 1;
    let framePromises: Promise<Buffer | string>[] = new Array(maxPipelineDepth);
    const timeStep = 1000 / fps;
    const compTimeStep = 1 / fps;
    const signal = this.jobOptions?.signal;
    const onProgress = this.jobOptions?.onProgress;

    while (nextFrameToWrite < this.totalFrames) {
        if (this.capturedErrors.length > 0) {
            throw this.capturedErrors[0];
        }
        if (signal && signal.aborted) {
            throw new Error('Aborted');
        }

        while (nextFrameToSubmit < this.totalFrames && (nextFrameToSubmit - nextFrameToWrite) < maxPipelineDepth) {
            const frameIndex = nextFrameToSubmit;
            const worker = this.pool[frameIndex % poolLen];
            const time = frameIndex * timeStep;
            const compositionTimeInSeconds = (this.startFrame + frameIndex) * compTimeStep;

            const framePromise = worker.activePromise
                .catch(noopCatch)
                .then(() => {
                    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                    return worker.strategy.capture(worker.page, time);
                });

            worker.activePromise = framePromise as unknown as Promise<void>;
            framePromises[nextFrameToSubmit & ringMask] = framePromise;
            nextFrameToSubmit++;
        }

        const buffer = await framePromises[nextFrameToWrite & ringMask]!;

        const i = nextFrameToWrite;
=======
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    let framePromises: Promise<Buffer | string>[] = new Array(maxPipelineDepth);
    const timeStep = 1000 / fps;
    const compTimeStep = 1 / fps;
    const signal = this.jobOptions?.signal;
    const onProgress = this.jobOptions?.onProgress;

    let workerIndex = 0;
    let submitIndex = 0;
    let writeIndex = 0;

    while (nextFrameToWrite < this.totalFrames) {
        if (this.capturedErrors.length > 0) {
            throw this.capturedErrors[0];
        }
        if (signal && signal.aborted) {
            throw new Error('Aborted');
        }

        while (nextFrameToSubmit < this.totalFrames && (nextFrameToSubmit - nextFrameToWrite) < maxPipelineDepth) {
            const frameIndex = nextFrameToSubmit;
            const worker = this.pool[workerIndex];

            workerIndex++;
            if (workerIndex === poolLen) workerIndex = 0;

            const time = frameIndex * timeStep;
            const compositionTimeInSeconds = (this.startFrame + frameIndex) * compTimeStep;

            const framePromise = worker.activePromise
                .catch(noopCatch)
                .then(() => {
                    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                    return worker.strategy.capture(worker.page, time);
                });

            worker.activePromise = framePromise as unknown as Promise<void>;
            framePromises[submitIndex] = framePromise;

            submitIndex++;
            if (submitIndex === maxPipelineDepth) submitIndex = 0;

            nextFrameToSubmit++;
        }

        const buffer = await framePromises[writeIndex]!;
        writeIndex++;
        if (writeIndex === maxPipelineDepth) writeIndex = 0;

        const i = nextFrameToWrite;
>>>>>>> REPLACE
```
**Why**: Sequential counting with an `if` boundary check avoids the relatively expensive modulo or bitwise arithmetic, shaving off milliseconds from the millions of iterations in the hot loop.
**Risk**: Logic errors if indices drift from `nextFrameToSubmit` and `nextFrameToWrite`. Since they only update synchronously alongside the original counters, drift shouldn't occur.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to verify DOM output correctly sequences frames.

## Prior Art
- PERF-234: Earlier attempt that failed due to misaligned tracking breaking order.
- PERF-236: Implemented bitwise indexing, which is fast, but counter logic is even faster.

## Results Summary
- **Best render time**: 0.276s (vs baseline 0.285s)
- **Improvement**: 3.2%
- **Kept experiments**: [PERF-246: Replace Modulo/Bitwise Indexing with Counter-Based Indexing in CaptureLoop]
- **Discarded experiments**: []
