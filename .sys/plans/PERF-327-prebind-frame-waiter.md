---
id: PERF-327
slug: prebind-frame-waiter
status: unclaimed
claimed_by: ""
created: 2024-04-21
completed: ""
result: ""
---

# PERF-327: Prebind Frame Waiter Promise Executor in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `CaptureLoop.ts`. Specifically, eliminating the dynamic closure allocation for the `Promise` executor used to track when the main loop must wait for a worker to queue a task.

## Background Research
In `CaptureLoop.ts`'s multi-worker actor model loop, when the pipeline is empty, the main process waits for a worker to supply the next frame using this construct:
```typescript
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(resolve => {
                    frameWaiterResolve = resolve;
                });
                continue;
            }
```
This requires allocating a new anonymous arrow function closure `resolve => { frameWaiterResolve = resolve; }` on every occurrence of an empty queue. V8 garbage collection manages these, but inside a high-throughput loop, pre-allocating the executor function eliminates this minor overhead. We have previously successfully applied this technique to `drainResolve`, `workerBlockedExecutors`, and `framePromiseExecutors`.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html`
- **Render Settings**: Baseline identical settings across all runs, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~45.3s (based on PERF-326)
- **Bottleneck analysis**: The cost of dynamically allocating closures inside the hot loop that V8 must then GC, taking CPU time away from Playwright IPC and FFmpeg encoding.

## Implementation Spec

### Step 1: Prebind the `frameWaiterResolve` Promise Executor
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
At the class level or inside `run()`, define a prebound executor:
```typescript
    const frameWaiterExecutor = (resolve: () => void) => {
        frameWaiterResolve = resolve;
    };
```
Replace the inline allocation in the main `while` loop:
```typescript
<<<<<<< SEARCH
            // Wait for the task to be queued by a worker or immediately queued
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(resolve => {
                    frameWaiterResolve = resolve;
                });
                continue;
            }
=======
            // Wait for the task to be queued by a worker or immediately queued
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(frameWaiterExecutor);
                continue;
            }
>>>>>>> REPLACE
```

**Why**: By extracting the closure to a static reference (`frameWaiterExecutor`), V8 does not need to dynamically allocate an arrow function each time the loop waits. This reduces GC pressure, combining with prior executor optimizations for compounding gains.
**Risk**: Negligible. The code behaves identically but reuses the same executor function instance.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM output is correct.
