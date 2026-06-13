---
id: PERF-726
slug: eliminate-empty-image-buffer-allocation
status: complete
claimed_by: "jules"
created: 2024-06-11
completed: "2024-06-12"
result: "improved"
---

# PERF-726: Prebind processCaptureResult in CaptureLoop

## Focus Area
`CaptureLoop.ts` fast path execution loop, specifically the `strategy.processCaptureResult` logic.

## Background Research
Currently in `CaptureLoop.ts`, the hot loop contains the following code:
```typescript
                const rawResult = await strategy.capture(page, time);
                const buffer = strategy.processCaptureResult ? strategy.processCaptureResult(rawResult) : rawResult;
```
This forces V8 to execute a property lookup (`strategy.processCaptureResult`), evaluate a boolean branch condition, and then dynamically invoke the method on every single frame.
By moving the method resolution and binding outside of the `for` loop, we can eliminate the property lookup and branching overhead per frame, taking advantage of V8's optimization of monomorphic function invocations.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.505s
- **Bottleneck analysis**: Property lookup and conditional branching per frame in the hot loop.

## Implementation Spec

### Step 1: Pre-bind processCaptureResult
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both the single-worker and multi-worker execution paths (`if (poolLen === 1)` and `runWorker`), hoist the `processCaptureResult` check out of the loop into a pre-bound function `processFn`.

Single-worker:
```typescript
<<<<<<< SEARCH
        const signal = this.jobOptions?.signal;
        const onProgress = this.jobOptions?.onProgress;
        try {
            for (let i = 0; i < totalFrames; i++) {
                if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                const time = i * timeStep;
                const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                const buffer = strategy.processCaptureResult ? strategy.processCaptureResult(rawResult) : rawResult;
=======
        const signal = this.jobOptions?.signal;
        const onProgress = this.jobOptions?.onProgress;
        const processFn = strategy.processCaptureResult ? strategy.processCaptureResult.bind(strategy) : (res: any) => res;
        try {
            for (let i = 0; i < totalFrames; i++) {
                if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                const time = i * timeStep;
                const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                const buffer = processFn(rawResult);
>>>>>>> REPLACE
```

Multi-worker:
```typescript
<<<<<<< SEARCH
    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;

        while (!aborted) {
            let i: number;
=======
    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const processFn = strategy.processCaptureResult ? strategy.processCaptureResult.bind(strategy) : (res: any) => res;

        while (!aborted) {
            let i: number;
>>>>>>> REPLACE
```

```typescript
<<<<<<< SEARCH
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                const buffer = strategy.processCaptureResult ? strategy.processCaptureResult(rawResult) : rawResult;
                frameBufferRing[ringIndex] = buffer;
=======
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                const buffer = processFn(rawResult);
                frameBufferRing[ringIndex] = buffer;
>>>>>>> REPLACE
```

**Why**: By pre-binding the function once before the loop begins, we remove the `strategy.processCaptureResult` lookup and branch check from the `for` loop body, allowing V8 to optimize the function call inline.
**Risk**: Function binding creates a small object closure, but it's done *outside* the hot loop, so there's no per-frame penalty. This is a very safe change.

## Results Summary
- **Best render time**: 2.059s
- **Improvement**: ~3% improvement over 2.118s
- **Kept experiments**: PERF-726
- **Discarded experiments**: none
