---
id: PERF-335
slug: prebind-frame-waiter-resolve
status: complete
claimed_by: "executor"
created: 2024-04-22
completed: ""
result: "impossible"
---

# PERF-335: Prebind frameWaiterResolve executor in CaptureLoop

## Focus Area
The actor model backpressure loop inside `CaptureLoop.ts` dynamically creates an anonymous closure on every tick the main pipeline blocks waiting for a frame worker.

## Background Research
In the `CaptureLoop.ts` actor model, when the main rendering pipeline needs to wait for a worker to finish capturing a frame, it blocks on a dynamically created promise:
```typescript
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(resolve => {
                    frameWaiterResolve = resolve;
                });
                continue;
            }
```
This allocates an anonymous closure (`resolve => { ... }`) on every blocking iteration. In highly saturated CPU environments like our headless microVM where workers frequently fall behind the main submission loop, this creates significant GC pressure across thousands of frames. Prebinding `workerBlockedExecutors` (PERF-321) previously showed this is an effective optimization strategy in V8.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~45s
- **Bottleneck analysis**: The inline literal closure allocation inside the pipeline backpressure loop creates V8 garbage collection pressure.

## Implementation Spec

### Step 1: Prebind the Promise executor
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Outside the main loop (around where `writerWaiterExecutor` is declared), declare a prebound executor:
   ```typescript
   const frameWaiterExecutor = (resolve: () => void) => {
       frameWaiterResolve = resolve;
   };
   ```
2. In the backpressure `while` loop, replace the dynamic closure:
   ```typescript
            // Wait for the task to be queued by a worker or immediately queued
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(frameWaiterExecutor);
                continue;
            }
   ```
**Why**: Avoids creating an anonymous closure (`resolve => { frameWaiterResolve = resolve; }`) on every blocked pipeline tick, reducing GC churn in the orchestration path.
**Risk**: Very low structural change. Functionally identical.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM rendering captures frames.

## Prior Art
- PERF-324: Prebound frame promise executors for workers.
- PERF-321: Prebound `workerBlockedExecutors`.

## Results Summary
- **Result**: impossible
- **Details**: The structural change proposed in this plan (prebinding `frameWaiterExecutor`) was already implemented and kept by a subsequent experiment (PERF-337). The task is redundant and obsolete.
