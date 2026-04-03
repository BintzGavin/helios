---
id: PERF-167
slug: inline-execute-frame-capture
status: complete
claimed_by: ""
created: 2024-04-03
completed: 2026-04-03
result: keep
---
# PERF-167: Inline executeFrameCapture function

## Focus Area
Frame Capture Loop in `Renderer.ts`. This is the highest-leverage optimization right now because `captureLoop` dominates wall-clock render time, and eliminating overhead per-frame reduces V8 micro-stalls.

## Background Research
In `packages/renderer/src/Renderer.ts`, the `captureLoop` creates an `executeFrameCapture` function. Then, for each frame, it invokes an arrow function `() => executeFrameCapture(...)` inside the `worker.activePromise.then()` closure. This introduces two nested function calls and an intermediate function reference on every frame. `PERF-160` and `PERF-161` established that inlining operations and removing intermediate closures in this hot loop directly improves rendering performance by lowering V8 execution stack overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: The frame capture loop runs sequentially across all frames. Any execution overhead (function calls, closure creation) multiplies by the number of frames.

## Implementation Spec

### Step 1: Inline `executeFrameCapture` in `Renderer.ts`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
1. Locate the definition of `const executeFrameCapture = function(...) {...}` inside the `captureLoop` function (around line 294) and delete it.
2. Update the `.then()` handler on `worker.activePromise` (around line 314) to inline the logic directly. Change this:
```typescript
const framePromise = worker.activePromise.then(
    () => executeFrameCapture(worker, compositionTimeInSeconds, time)
);
```
To this:
```typescript
const framePromise = worker.activePromise.then(() => {
    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
    return worker.strategy.capture(worker.page, time);
});
```

**Why**: By inlining the body of `executeFrameCapture` directly into the `.then` closure, we eliminate an unnecessary nested function call on every frame, reducing call stack depth and V8 execution overhead in the hot loop.
**Risk**: Negligible risk. The variables `worker`, `compositionTimeInSeconds`, `time`, and `noopCatch` are all captured correctly in the closure context from the loop body.

## Variations
No variations.

## Canvas Smoke Test
Run a standard canvas benchmark rendering (e.g., `packages/renderer/tests/fixtures/benchmark.ts` modifying `mode: 'canvas'`) to ensure the renderer successfully creates an output.

## Correctness Check
Review the output `dom-animation.mp4` from the benchmark to ensure frames are successfully encoded and not black or empty.

## Prior Art
- PERF-160: Replaced `.bind` with an inline closure in `Renderer.ts`.
- PERF-161: Inline capture and destructuring.

## Results Summary
- **Best render time**: 36.046s (vs baseline 36.167s)
- **Improvement**: 0.33%
- **Kept experiments**: PERF-167
- **Discarded experiments**:
