---
id: PERF-091
slug: eliminate-hot-loop-closures
status: complete
claimed_by: "executor-session"
created: 2024-05-31
completed: ""
result: "discard"
---

# PERF-091: Eliminate Hot Loop Closures and Redundant Exception Handlers

## Focus Area
V8 Garbage Collection and execution frame overhead in the `Renderer.ts` hot loop.

## Background Research
In V8, creating anonymous functions (closures) inside a hot `while` loop forces the JavaScript engine to allocate memory for the closure environment on every single iteration. This causes constant minor GC churn (scavenger) which leads to micro-stalls.
Furthermore, redundant `try/catch` blocks—catching Promises that are mathematically guaranteed not to reject—disable certain optimization paths in the V8 compilers, adding unnecessary overhead to the execution frame.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Fixed resolution, FPS, duration, and codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.474s (as of PERF-089)
- **Bottleneck analysis**: CPU profiling of Node.js during headless Chromium driving shows noticeable time spent in V8 internal GC (scavenger) and promise microtask resolution during the frame capture loop.

## Implementation Spec

### Step 1: Hoist closures in `Renderer.ts` frame loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
1. Above the `while (nextFrameToWrite < totalFrames)` loop (e.g., inside the `captureLoop` definition, before `let nextFrameToSubmit = 0;`), declare a static no-op catch handler:
   ```typescript
   const noopCatch = () => {};
   ```
2. In the same scope, declare a static write error handler for FFmpeg:
   ```typescript
   const writeErrorHandler = (err?: Error | null) => {
       if (err) {
           ffmpegProcess.emit('error', err);
       }
   };
   ```
3. Inside the inner `while (nextFrameToSubmit < totalFrames ...)` loop, replace the inline catch allocation `framePromise.catch(() => {})` with the hoisted handler:
   ```typescript
   worker.activePromise = framePromise.catch(noopCatch) as Promise<void>;
   ```
4. Replace the inline error handler in `ffmpegProcess.stdin.write` in the two places it occurs (inside the loop and after the loop):
   ```typescript
   const canWriteMore = ffmpegProcess.stdin.write(buffer, writeErrorHandler);
   ```
**Why**: Eliminates the allocation of closures per frame, directly reducing minor GC pauses and V8 memory churn during high-frequency capture.
**Risk**: Minimal. The references to `ffmpegProcess` and the `noop` behavior remain identically scoped and functional.

### Step 2: Remove redundant `try/catch` from `processWorkerFrame`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside `processWorkerFrame`, remove the `try/catch` block around `await worker.activePromise`:
```typescript
const processWorkerFrame = async (worker: any, compositionTimeInSeconds: number, time: number) => {
    await worker.activePromise;
    await worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    return worker.strategy.capture(worker.page, time);
};
```
**Why**: Because `worker.activePromise` is always populated via `.catch(noopCatch)`, it is mathematically guaranteed to never reject. The `try/catch` block is unreachable and forces V8 to maintain an exception frame for the microtask, degrading performance.
**Risk**: None. The Promise resolves identically.

## Variations
If hoisting the error handlers has negative effects, fallback to only removing the redundant `try/catch` handlers.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-dom-selector.ts` and ensure it still captures correctly.

## Correctness Check
Run the main `benchmark.ts` to ensure rendering still outputs a valid video file.

## Prior Art
- PERF-088: Removed `return await` for V8 microtask optimization.
- PERF-076 & PERF-087: Preallocated arrays and object pools to reduce GC churn.
- This plan continues the compounding gains by targeting closure allocations inside the identical hot loop.


## Results Summary
- **Best render time**: 33.906s (vs baseline 33.474s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [hoist-closures]
