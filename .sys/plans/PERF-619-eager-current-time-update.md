---
id: PERF-619
slug: eager-current-time-update
status: complete
claimed_by: ""
created: 2024-05-29
completed: ""
result: ""
---

# PERF-619: Eager Update of currentTime to Eliminate .then in CdpTimeDriver

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
In `CdpTimeDriver.ts`, advancing virtual time uses CDP's `Emulation.setVirtualTimePolicy`. The `runSetTime` method creates a new Promise for the CDP event and immediately chains a `.then(() => { this.currentTime = timeInSeconds; })` to update the internal time state once the promise resolves. This trailing `.then()` allocates a new Promise and a closure function on every single frame loop iteration for every worker, increasing V8 microtask overhead.

Because `CaptureLoop.ts` awaits the final capture result for each worker frame before advancing, `runSetTime` is never called concurrently on the same driver instance. Therefore, we can safely *eagerly* update `this.currentTime = timeInSeconds` right before returning the CDP Promise, completely eliminating the need for the `.then()` chain and avoiding modifications to the CDP event handler. Note: This idea was explored in PERF-601 but it seems to have not been fully merged or explored properly based on the file contents.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/output/example-build/composition.html` (dom-benchmark)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s
- **Bottleneck analysis**: V8 garbage collection and Promise chaining overhead from inline `.then()` closures in the capture hot path.

## Implementation Spec

### Step 1: Eliminate .then() in runSetTime
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Modify the `runSetTime` method to eagerly assign `this.currentTime = timeInSeconds` and return the Promise directly without chaining `.then()`.

Find this block:
```typescript
    this.setVirtualTimePolicyParams.budget = budget;
    return new Promise<void>(this.virtualTimePromiseExecutor).then(() => {
        this.currentTime = timeInSeconds;
    });
```
Replace it with:
```typescript
    this.setVirtualTimePolicyParams.budget = budget;
    this.currentTime = timeInSeconds;
    return new Promise<void>(this.virtualTimePromiseExecutor);
```

**Why**: Eliminates the inline `() => { this.currentTime = timeInSeconds; }` closure and avoids allocating an extra Promise via `.then()` per frame. Because we assign it eagerly, we avoid adding any assignment logic into the CDP event handler.
**Risk**: If `runSetTime` were ever called concurrently before the promise resolved, the eager update would calculate an incorrect `delta` for the second call. However, the `CaptureLoop.ts` orchestrator strictly serializes frame processing per worker via awaiting the capture result, so concurrency per `TimeDriver` instance is impossible.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure frame advancement remains accurate.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance. Follow up with `npm run test -w packages/renderer` to ensure frame advancement remains accurate.

## Prior Art
- PERF-601
