---
id: PERF-271
slug: optimize-pipeline-promise-chain
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-271: Optimize Pipeline Promise Chain Allocations

## Focus Area
The hot frame generation pipeline in `CaptureLoop.ts` and the `CdpTimeDriver.ts` fallback loop. These loops dynamically allocate multiple intermediate Promise wrappers per frame, causing measurable GC overhead and microtask serialization delays.

## Background Research
In `CaptureLoop.ts`, every scheduled frame creates a `.catch(noopCatch).then(...)` chain on the `worker.activePromise`. This causes V8 to allocate at least two new Promises per frame per worker.
Similarly, `CdpTimeDriver.ts` allocates a `.then(this.handleStabilityCheckResponse)` on every frame for its stability fallback, and `.catch(this.handleSyncMediaError)` for media syncing.
By simplifying these chains to pass success/rejection handlers directly (e.g., using `then(executeFrame, executeFrame)` and using `async/await` with `try/catch`), we can bypass intermediate Promise allocations.

## Benchmark Configuration
- **Composition URL**: `file://.../output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: `1280x720`, `30fps`, `3 seconds`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.529s
- **Bottleneck analysis**: Microtask and Promise object allocation in hot loops.

## Implementation Spec

### Step 1: Optimize Promise Chain in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `run()`, locate the pipeline submission loop:
```typescript
            const framePromise = worker.activePromise
                .catch(noopCatch)
                .then(() => {
                    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                    return worker.strategy.capture(worker.page, time);
                });
```
Replace it with a single `.then()` allocation using a shared closure for both resolve and reject:
```typescript
            const executeFrame = () => {
                worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
                return worker.strategy.capture(worker.page, time);
            };
            const framePromise = worker.activePromise.then(executeFrame, executeFrame);
```
**Why**: Avoids the extra Promise allocation from `.catch()` and reduces microtask queue depth.
**Risk**: None. The logical execution flow remains strictly identical (both resolve and reject trigger `executeFrame`).

### Step 2: Optimize Fallback Chain in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. In `setTime()`, locate the media sync execution:
```typescript
      await this.client!.send('Runtime.callFunctionOn', this.syncMediaParams).catch(this.handleSyncMediaError);
```
Change it to use `try/catch` without allocating a `.catch` Promise:
```typescript
      try {
        await this.client!.send('Runtime.callFunctionOn', this.syncMediaParams);
      } catch (e: any) {
        this.handleSyncMediaError(e);
      }
```
2. Locate the `Promise.race` for stability checks:
```typescript
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)
          : page.evaluate(...))
```
Remove the `.then(...)` allocation and evaluate the response directly after the `await Promise.race()`:
```typescript
      const raceRes = await Promise.race([
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams)
          : page.evaluate("if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();")),
        timeoutPromise
      ]);

      if (raceRes && (raceRes as any).exceptionDetails) {
        throw new Error('Stability check failed: ' + (raceRes as any).exceptionDetails.exception?.description);
      }
```
**Why**: Eliminates unnecessary `.then()` and `.catch()` Promise allocations per frame inside `CdpTimeDriver`, avoiding memory overhead for Canvas mode renders.

## Canvas Smoke Test
Run the standard Canvas rendering benchmark (e.g., `npm run test` or render a Canvas composition manually) to verify that `CdpTimeDriver` changes do not break stability checks.

## Correctness Check
Run the DOM benchmark and inspect the resulting `test-output.mp4` to verify visual correctness (frames are not skipped or out-of-order).
