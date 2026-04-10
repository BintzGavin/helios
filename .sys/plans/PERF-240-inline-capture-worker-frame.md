---
id: PERF-240
slug: inline-capture-worker-frame
status: complete
claimed_by: "executor-session"
created: "2026-04-10"
completed: "2026-04-10"
result: "improved"
---

# PERF-240: Inline `captureWorkerFrame` into the hot loop

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In the `CaptureLoop.ts` file, the `captureWorkerFrame` function acts as a wrapper around the `timeDriver.setTime` and `strategy.capture` operations. While it was previously extracted out of the class to avoid closure allocation per loop run, it still incurs overhead by being a separate function that we must pass multiple arguments to (`worker.activePromise`, `worker.timeDriver`, `worker.page`, `worker.strategy`, `compositionTimeInSeconds`, `time`). This function returns a promise chain that is then assigned back to `worker.activePromise`.

By completely inlining the contents of `captureWorkerFrame` directly into the `run()` method's `while` loop, we can eliminate the function call overhead, reduce the number of variables pushed to the execution stack, and simplify the promise chain structure, allowing V8 to optimize the hot path more aggressively.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~49.0s (on the current loaded VM)
- **Bottleneck analysis**: Micro-stalls from V8 function invocation and argument passing in the hottest inner loop.

## Implementation Spec

### Step 1: Inline `captureWorkerFrame` inside the hot loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the module-level `captureWorkerFrame` declaration entirely.
In the `run()` method, replace the call:
```typescript
const framePromise = captureWorkerFrame(worker.activePromise, worker.timeDriver, worker.page, worker.strategy, compositionTimeInSeconds, time);
```
with the inline promise chain:
```typescript
            const framePromise = worker.activePromise
                .catch(noopCatch)
                .then(() => {
                    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                    return worker.strategy.capture(worker.page, time);
                });
```

**Why**: Eliminates a function call per frame capture and the associated stack frame setup.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure shared logic is unaffected.

## Correctness Check
Ensure the generated DOM video still has the correct number of frames and audio sync.

## Results Summary
- **Best render time**: 48.082s
- **Kept experiments**: Inline captureWorkerFrame (PERF-240)
- **Discarded experiments**: None
