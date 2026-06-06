---
id: PERF-685
slug: prebind-capture-closure
status: complete
claimed_by: "executor-session"
created: 2024-11-20
completed: 2026-06-06
result: discard
---

# PERF-685: Prebind Capture Closure in CaptureLoop

## Focus Area
`CaptureLoop.ts` hot loop, specifically the promise `.then()` chain used to await the strategy capture after advancing virtual time.

## Background Research
In the inner render loop of `CaptureLoop.ts`, we currently await the virtual time advancement and chain the capture strategy via an inline anonymous closure:

```typescript
const buffer = setTimeResult
    ? await setTimeResult.then(() => strategy.capture(page, time))
    : await strategy.capture(page, time);
```

While V8 highly optimizes inline closures for the `new Promise` constructor, we observed in PERF-680 that using an inline anonymous closure for the writer wait loop (`writerWaiterExecutor`) caused a severe performance regression (~2.534s vs ~2.127s) compared to a pre-allocated closure. By dynamically allocating `() => strategy.capture(page, time)` on every frame, we incur continuous scope allocation and garbage collection overhead in the hottest path of the renderer. Prebinding this closure before the loop and updating a mutable `currentCaptureTime` variable avoids this per-frame allocation.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html` (or standard DOM benchmark)
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.18s
- **Bottleneck analysis**: V8 closure allocation overhead in the core capture hot loop.

## Implementation Spec

### Step 1: Prebind the Capture Closure in Single Worker Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker fast path (`if (poolLen === 1)`), prebind the closure before the loop and use a mutable variable for time.

```typescript
        const worker = this.pool[0];
        const { timeDriver, strategy, page } = worker;
        let fatalError: any = null;

        let currentCaptureTime = 0;
        const captureClosure = () => strategy.capture(page, currentCaptureTime);

        const signal = this.jobOptions?.signal;
        const onProgress = this.jobOptions?.onProgress;
        try {
            for (let i = 0; i < totalFrames; i++) {
                if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                const time = i * timeStep;
                currentCaptureTime = time;
                const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = setTimeResult
                    ? await setTimeResult.then(captureClosure)
                    : await strategy.capture(page, time);
```

### Step 2: Prebind the Capture Closure in Multi-Worker Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `runWorker`, apply the same optimization for the multi-worker path.

```typescript
    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        let currentCaptureTime = 0;
        const captureClosure = () => strategy.capture(page, currentCaptureTime);

        while (!aborted) {
            // ...
            const time = i * timeStep;
            currentCaptureTime = time;
            const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

            const ringIndex = i & ringMask;

            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            try {
                const buffer = setTimeResult
                    ? await setTimeResult.then(captureClosure)
                    : await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
```

**Why**: Reusing a single closure reference avoids continuous allocation of a new function scope on every frame.
**Risk**: Very low. `currentCaptureTime` is synchronously updated right before `setTimeResult` is created, and the Promise microtask resolves asynchronously later but uses the correct latest `currentCaptureTime`. Because both the fast path and multi-worker worker paths `await` their frames sequentially, `currentCaptureTime` will not be overwritten by the next loop iteration before the closure executes.

## Variations
None.

## Canvas Smoke Test
Not directly applicable to Canvas API as this optimizes the general render loop timeline, but ensure Canvas compositions still render successfully.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Results Summary
- **Best render time**: 2.293s (vs baseline ~2.18s)
- **Improvement**: 0.0%
- **Kept experiments**: none
- **Discarded experiments**: Prebind Capture Closure
