---
id: PERF-342
slug: prebind-captureloop-waiters
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-342: Prebind CaptureLoop Waiter Executors

## Focus Area
`CaptureLoop.ts` frame processing synchronization logic.

## Background Research
In the multi-worker actor model of `CaptureLoop.ts`, there are dynamic closure allocations during backpressure and synchronization events. Specifically, `writerWaiterExecutor` and `frameWaiterExecutor` are dynamically allocated as closures capturing mutable state (`writerWaiterResolve` and `frameWaiterResolve`). The executors and closures are created on every `new Promise` instantiation within the hot `while` loop (in the worker run loop and main thread drain loop) when waiting for pipeline capacity or frames.

By migrating these to prebound methods or hoisting their definitions outside the loop structure completely, we can reduce dynamic Promise executor allocation overhead. We did something similar for `workerBlockedExecutors` in PERF-321 which was successful, but `writerWaiterExecutor` and `frameWaiterExecutor` remain inline in the main execution block. Moving these out of the closure scope of `run()` completely (making them class methods or prebound functions with explicit state management) could further reduce GC pressure in high-throughput headless environments.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A
- **Bottleneck analysis**: Dynamic closure allocation in `run()` for `writerWaiterExecutor` and `frameWaiterExecutor` when `new Promise` is instantiated in the `while` loops adds GC churn during backpressure.

## Implementation Spec

### Step 1: Pre-bind the Waiter Executors outside `run()`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Add state variables to the class for the resolves:
   ```typescript
   private writerWaiterResolve: (() => void) | null = null;
   private frameWaiterResolve: (() => void) | null = null;
   ```
2. Add the prebound executors to the class:
   ```typescript
   private writerWaiterExecutor = (resolve: () => void) => {
       this.writerWaiterResolve = resolve;
   };

   private frameWaiterExecutor = (resolve: () => void) => {
       this.frameWaiterResolve = resolve;
   };
   ```
3. In `run()`, replace local variables `writerWaiterResolve` and `frameWaiterResolve` with `this.writerWaiterResolve` and `this.frameWaiterResolve`.
4. Replace local executors `writerWaiterExecutor` and `frameWaiterExecutor` with `this.writerWaiterExecutor` and `this.frameWaiterExecutor` when constructing `new Promise`.
5. Update all usages of `writerWaiterResolve` and `frameWaiterResolve` within `checkState()`, `runWorker()`, and the main write loop to use `this`.

**Why**: Avoids dynamic closure allocation per synchronization event. Moving them to the class level ensures a single instance of the function object.
**Risk**: If state is not cleared correctly or multiple calls conflict, but the loop logic already guards against this.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`

## Prior Art
- PERF-321 (Prebind worker blocked executor)
- PERF-338 (Prebind stability timeout executor)
