---
id: PERF-275
slug: preallocate-execute-capture-closure
status: complete
claimed_by: "Jules"
created: 2024-05-30
completed: "2026-04-14"
result: "32.143s"
---

# PERF-275: Preallocate Execute Capture Closure in Ring Buffer

## Focus Area
The hot frame generation pipeline in `CaptureLoop.ts`. Specifically, the dynamic allocation of the `executeCapture` anonymous arrow function on every iteration of the frame submission loop.

## Background Research
In `CaptureLoop.ts`, the inner pipeline submission loop creates a new `executeCapture` closure for every single frame to be processed. This closure captures local variables like `worker`, `compositionTimeInSeconds`, and `time`:
```typescript
            const executeCapture = () => {
                    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                    return worker.strategy.capture(worker.page, time);
                };

            const framePromise = worker.activePromise.then(executeCapture, executeCapture);
```
Since the `maxPipelineDepth` is fixed and acts as a ring buffer for promises (`framePromises`), we can preallocate a corresponding array of execution context objects and a fixed array of bound closures. By mutating the context object properties in the loop and passing the pre-bound closure to `.then()`, we completely eliminate dynamic closure allocation per frame, significantly reducing V8 garbage collection overhead and execution time in the critical path.

## Benchmark Configuration
- **Composition URL**: `file://.../output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: `1280x720`, `30fps`, `3 seconds`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.105s
- **Bottleneck analysis**: Microtask overhead and dynamic closure allocations during the hot loop in `CaptureLoop`.

## Implementation Spec

### Step 1: Preallocate Contexts and Closures in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `run()`, before the `while (nextFrameToWrite < this.totalFrames)` loop, preallocate a context array and a closure array parallel to `framePromises`. We will define an interface or a shape for the context to hold the loop variables.

```typescript
    const framePromises = new Array<Promise<Buffer | string>>(maxPipelineDepth);
    const contextRing = new Array(maxPipelineDepth);
    const executeCaptures = new Array(maxPipelineDepth);

    for (let i = 0; i < maxPipelineDepth; i++) {
        const ctx = { time: 0, compositionTimeInSeconds: 0, worker: null as any };
        contextRing[i] = ctx;
        executeCaptures[i] = () => {
            ctx.worker.timeDriver.setTime(ctx.worker.page, ctx.compositionTimeInSeconds).then(undefined, noopCatch);
            return ctx.worker.strategy.capture(ctx.worker.page, ctx.time);
        };
    }
```

### Step 2: Update the Submission Loop to Use Preallocated Closures
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the inline closure allocation inside the submission loop:
```typescript
        while (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth && nextFrameToSubmit < this.totalFrames) {
            const frameIndex = nextFrameToSubmit;
            const worker = this.pool[frameIndex % poolLen];
            const time = frameIndex * timeStep;
            const compositionTimeInSeconds = (this.startFrame + frameIndex) * compTimeStep;

            const ringIndex = frameIndex % maxPipelineDepth;
            const ctx = contextRing[ringIndex];
            ctx.time = time;
            ctx.compositionTimeInSeconds = compositionTimeInSeconds;
            ctx.worker = worker;

            const executeCapture = executeCaptures[ringIndex];
            const framePromise = worker.activePromise.then(executeCapture, executeCapture);

            worker.activePromise = framePromise as unknown as Promise<void>;
            framePromises[ringIndex] = framePromise;
            nextFrameToSubmit++;
        }
```
**Why**: By updating a pre-existing object and using a pre-bound closure, we avoid allocating a new function object on every frame iteration. This leverages the existing ring-buffer bounds (`maxPipelineDepth`).
**Risk**: Data races if the `activePromise` execution is delayed beyond a full wrap-around of the ring buffer. However, the `while` loop condition `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth` strictly prevents overwriting a ring buffer index until its corresponding frame has been `await`ed and written, guaranteeing the context is safe to mutate.

## Canvas Smoke Test
Run the Canvas test suite to ensure `CaptureLoop` behaves correctly.

## Correctness Check
Run the DOM benchmark and inspect the resulting video to ensure frames are correctly captured, ordered, and not duplicated (which would happen if closures evaluated the wrong context variables).
