---
id: PERF-230
slug: eliminate-async-wrapper
status: unclaimed
claimed_by: ""
created: 2024-06-06
completed: ""
result: ""
---
# PERF-230: Eliminate Async Wrapper for Worker Frames

## Focus Area
DOM Rendering Pipeline - Frame Submission Logic in `CaptureLoop.ts`.

## Background Research
In `CaptureLoop.ts`, the orchestrator queues up to `maxPipelineDepth` frames by calling `captureWorkerFrame`. To do this, it reads the `worker` from `this.pool[frameIndex % poolLen]`.
Currently, `captureWorkerFrame` is an `async` arrow function:
```typescript
const captureWorkerFrame = async (activePromise, timeDriver, page, strategy, compositionTimeInSeconds, time) => {
    try {
        await activePromise;
    } catch (e) {
        // ignore
    }
    timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);
    return strategy.capture(page, time);
};
```
This function allocates a new Promise on the V8 heap and enters a new `async` context on every invocation. We can use standard promise chaining natively instead of an `async` arrow function wrapper, which avoids V8 creating a new `async` context frame every iteration.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`file:///app/examples/simple-animation/composition.html`)
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.91s
- **Bottleneck analysis**: Micro-stalls from V8 async context creation overhead inside the Node JS main loop.

## Implementation Spec

### Step 1: Optimize `captureWorkerFrame` using native Promise chaining
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change `captureWorkerFrame` from an `async` function to a standard function returning a Promise.
```typescript
<<<<<<< SEARCH
    const captureWorkerFrame = async (activePromise: Promise<void>, timeDriver: TimeDriver, page: import('playwright').Page, strategy: RenderStrategy, compositionTimeInSeconds: number, time: number): Promise<Buffer | string> => {
        try {
            await activePromise;
        } catch (e) {
            // ignore
        }
        timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);
        return strategy.capture(page, time);
    };
=======
    const captureWorkerFrame = (activePromise: Promise<void>, timeDriver: TimeDriver, page: import('playwright').Page, strategy: RenderStrategy, compositionTimeInSeconds: number, time: number): Promise<Buffer | string> => {
        return activePromise.catch(noopCatch).then(() => {
            timeDriver.setTime(page, compositionTimeInSeconds).catch(noopCatch);
            return strategy.capture(page, time);
        });
    };
>>>>>>> REPLACE
```

**Why**: Replaces the `async/await` wrapper function with a direct `Promise.then()` chain. V8 resolves native promise chains more efficiently than entering a new `async` generator context for every frame, reducing CPU overhead and garbage collection.

### Step 2: Ensure proper testing, verification, review, and reflection are done
**What to change**:
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

### Step 3: Submit the PR
**What to change**:
Submit the changes with a proper PR title and body.

## Correctness Check
Run the DOM render benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify performance and correctness.
Run `npm run test -w packages/renderer` to ensure no functionality is broken.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to verify Canvas mode functions correctly.

## Prior Art
PERF-127 and PERF-192, which also eliminated async/await wrappers in favor of native promise chains.
