---
id: PERF-134
slug: eliminate-promise-closures
status: complete
claimed_by: "executor-session"
created: 2024-05-27
completed: "2024-05-27"
result: "discard"
---
# PERF-134: Eliminate hot-loop Promise closures with Ring Buffers and Unchained Execution

## Focus Area
`packages/renderer/src/Renderer.ts` and `packages/renderer/src/drivers/SeekTimeDriver.ts`. We target the V8 memory allocation and microtask queue overhead inherent in `.then()` promise chains within the DOM frame capture hot loop.

## Background Research
In Node.js, every `.then()` or `.catch()` call allocates a new Promise and a closure (execution context), which then needs to be scheduled on the V8 microtask queue. In our hot loop running across multiple workers, this creates significant garbage collection pressure and subtly delays CDP message firing.
Currently, `SeekTimeDriver.ts` uses `.then()` to catch errors and return evaluation parameters to a pool. Furthermore, `Renderer.ts` chains `setTimePromise.then(() => capturePromise)`, which creates an artificial sequential dependency in Node.js despite both CDP commands targeting the same Chromium websocket connection. Since Chromium executes incoming CDP commands sequentially on a single session, we can safely fire both `Runtime.evaluate` and `HeadlessExperimental.beginFrame` consecutively without awaiting the first in Node.js.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: Fixed test fixture defaults
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.4s
- **Bottleneck analysis**: V8 Promise allocation and microtask scheduling overhead during frame evaluations.

## Implementation Spec

### Step 1: Use a Ring Buffer in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Replace `private evaluateParamsPool: any[] = [];` with a ring buffer:
```typescript
private evaluateParamsRing: any[] = Array.from({ length: 16 }, () => ({ expression: '', awaitPromise: true, returnByValue: false }));
private ringIndex: number = 0;
```
2. Inside `setTime()`, instead of popping from the pool and appending `.then()`, simply grab the next object from the ring buffer:
```typescript
const params = this.evaluateParamsRing[this.ringIndex];
this.ringIndex = (this.ringIndex + 1) & 15;
params.expression = `window.__helios_seek(${timeInSeconds}, ${this.timeout})`;
return this.cdpSession.send('Runtime.evaluate', params) as unknown as Promise<void>;
```
Apply this logic to both the `frames.length === 1` path and the multi-frame loop path. Completely remove the `.then()` chain and `exceptionDetails` check, returning the `cdpSession.send` promise directly.
**Why**: Avoids `.then` closure allocation, V8 microtask scheduling, and array push/pop per frame.

### Step 2: Unchain `setTime` and `capture` in `Renderer.ts`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In `processWorkerFrame`, remove the `.then(() => capturePromise)` chaining pattern:
```typescript
const processWorkerFrame = (worker: any, compositionTimeInSeconds: number, time: number) => {
    return worker.activePromise.catch(() => {}).then(() => {
        worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
        return worker.strategy.capture(worker.page, time);
    });
};
```
**Why**: Chromium will naturally execute the CDP commands in the order they are received on the websocket. Node.js no longer needs to wait for the `setTime` acknowledgement to resolve before returning the `capture` command promise. This eliminates another `.then()` closure per frame while preserving the necessary sequential execution in the browser.

## Canvas Smoke Test
Verify rendering works by running `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to ensure the strategy correctly synchronizes media elements and generates valid video outputs without race conditions.

## Results Summary
- **Best render time**: 33.669s (vs baseline 33.400s)
- **Improvement**: 0% (Regression)
- **Kept experiments**: None
- **Discarded experiments**: Eliminate hot-loop Promise closures with Ring Buffers and Unchained Execution
