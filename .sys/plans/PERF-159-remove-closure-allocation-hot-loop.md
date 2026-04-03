---
id: PERF-159
slug: remove-closure-allocation-hot-loop
status: complete
claimed_by: "executor-session"
created: 2024-05-26
completed: ""
result: ""
---

# PERF-159: Remove anonymous async function allocation inside hot loop

## Focus Area
Frame Capture Loop in `packages/renderer/src/Renderer.ts`

## Background Research
According to our performance journal, the frame capture hot loop (`while (nextFrameToSubmit < totalFrames ...)` inside `captureLoop()`) is extremely sensitive to memory churn and micro-stalls. Within this loop, an anonymous closure is allocated inside the `.then` block for every single frame:
```javascript
const framePromise = worker.activePromise.then(() => {
    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
    return worker.strategy.capture(worker.page, time);
});
```
This anonymous closure `() => { ... }` causes unnecessary V8 allocation pressure that could be mitigated by creating a static function binding or reusing a static closure.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.636s (Based on recent PERF-125 improvements)
- **Bottleneck analysis**: Continuous V8 allocation of anonymous closures inside the `nextFrameToSubmit` hot loop introduces garbage collection pressure and delays.

## Implementation Spec

### Step 1: Hoist and refactor closure outside of hot loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Before the `while (nextFrameToWrite < totalFrames)` loop, define a bound executor function:
```typescript
const executeFrameCapture = (worker: any, compTime: number, time: number) => {
    worker.timeDriver.setTime(worker.page, compTime).catch(noopCatch);
    return worker.strategy.capture(worker.page, time);
};
```
Then, inside the hot loop, replace the anonymous closure with a bound reference to this function:
```typescript
const framePromise = worker.activePromise.then(
    executeFrameCapture.bind(null, worker, compositionTimeInSeconds, time)
);
```
**Why**: By creating a single static execution function outside the loop and utilizing `.bind` (or creating a factory), we eliminate the repeated closure allocation on every frame, reducing V8 GC micro-stalls.
**Risk**: Potential reference leaks or scope context loss if `worker` is not correctly bound.

## Variations

### Variation A: Class Method
If `bind` is too slow due to V8 optimizations, extract the function to a private class method in `Renderer` instead.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas capture is unaffected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM frames remain correct.

## Prior Art
- PERF-089: Identified the anonymous async function allocation inside the hot loop as a potential GC micro-stall source.

## Results Summary
- **Best render time**: 34.361s (vs baseline 36.166s)
- **Improvement**: ~5%
- **Kept experiments**: PERF-159
- **Discarded experiments**: none
