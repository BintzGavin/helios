---
id: PERF-139
slug: eliminate-redundant-closures
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: ""
result: ""
---
# PERF-139: Eliminate Redundant Closures in Capture Loop

## Focus Area
`packages/renderer/src/Renderer.ts` hot loop orchestration.

## Background Research
In `PERF-125`, the `try-catch` wrapper around `await worker.activePromise` was replaced with `.catch(() => {})`. However, analysis of the `captureLoop` shows that a redundant `.catch(() => {})` is being chained onto `worker.activePromise` twice per frame.
First, when `worker.activePromise` is assigned:
`worker.activePromise = framePromise.catch(() => {}) as Promise<void>;`
Second, when the worker processes the next frame:
`return worker.activePromise.catch(() => {}).then(() => ...)`

Since the first `.catch()` ensures `worker.activePromise` never rejects, the second `.catch(() => {})` is completely redundant. It blindly allocates a new Promise, schedules an empty closure, and adds a microtask to the V8 event loop for every single frame.
Additionally, the loop allocates an anonymous error callback for `ffmpegProcess.stdin.write` and an anonymous `() => {}` for the first `.catch` on every frame. Hoisting these closures and removing the redundant `.catch()` will reduce V8 GC pressure and IPC micro-stalls.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: Baseline settings matching current testing traces
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.057s
- **Bottleneck analysis**: Promise allocations and microtask queue overhead in the hot loop.

## Implementation Spec

### Step 1: Hoist constant closures outside the `captureLoop`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside `captureLoop` but before the `while (nextFrameToWrite < totalFrames)` loop, declare the following constants:
```typescript
        const noopCatch = () => {};
        const onWriteError = (err?: Error | null) => {
            if (err) {
               ffmpegProcess.emit('error', err);
            }
        };
```
**Why**: Prevents V8 from allocating new function objects on the heap for every frame.
**Risk**: None.

### Step 2: Inline `processWorkerFrame` and remove redundant `.catch()`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Remove the `processWorkerFrame` function definition entirely.
Replace the inner pipeline loop contents with:
```typescript
              while (nextFrameToSubmit < totalFrames && (nextFrameToSubmit - nextFrameToWrite) < maxPipelineDepth) {
                  const frameIndex = nextFrameToSubmit;
                  const worker = pool[frameIndex % poolLen];
                  const time = frameIndex * timeStep;
                  const compositionTimeInSeconds = (startFrame + frameIndex) * compTimeStep;

                  const framePromise = worker.activePromise.then(() => {
                      const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
                      const capturePromise = worker.strategy.capture(worker.page, time);
                      return setTimePromise.then(() => capturePromise);
                  });

                  // Add a no-op catch handler to prevent unhandled promise rejections on abort/error
                  worker.activePromise = framePromise.catch(noopCatch) as Promise<void>;

                  framePromises[nextFrameToSubmit] = framePromise;
                  nextFrameToSubmit++;
              }
```
**Why**: Removing the redundant `.catch()` eliminates one Promise allocation and one microtask stall per frame. Inlining the execution removes the function call overhead.

### Step 3: Update `ffmpegProcess.stdin.write` call
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside the `while` loop, change:
```typescript
              const canWriteMore = ffmpegProcess.stdin.write(buffer, (err?: Error | null) => {
                  if (err) {
                     ffmpegProcess.emit('error', err);
                  }
              });
```
to:
```typescript
              const canWriteMore = ffmpegProcess.stdin.write(buffer, onWriteError);
```
And apply the same update to the `finalBuffer` write logic at the end of the method.
**Why**: Reuses the static error handler instead of creating a new one per frame.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works.

## Correctness Check
Run `npm run build` and `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify DOM output is still correct and the render loop successfully completes without hanging.

## Results Summary
- **Best render time**: 34.328s
- **Kept experiments**: PERF-139-eliminate-redundant-closures
- **Discarded experiments**: None
