---
id: PERF-312
slug: avoid-seek-promises-allocation
status: unclaimed
claimed_by: ""
created: 2024-05-26
completed: ""
result: ""
---

# PERF-312: Avoid Promise.all() Allocation Overhead in SeekTimeDriver

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `SeekTimeDriver.ts`

## Background Research
In `SeekTimeDriver.setTime()`, we evaluate a CDP string on each iframe. To track completion of this `Runtime.evaluate`, the driver allocates an array of Promises and returns `Promise.all(promises)`.

However, inspecting the caller in `CaptureLoop.ts` (`timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);`), we see that the resulting promise is intentionally **not awaited**. The architecture deliberately fires `timeDriver.setTime()` and immediately proceeds to `strategy.capture()`, allowing `Runtime.evaluate` and `HeadlessExperimental.beginFrame` to be pipelined asynchronously on the CDP session.

Because the promise is completely unobserved except for a `.then(undefined, noopCatch)` which catches errors, allocating `Promise.all(promises)` and wrapping it up is pure garbage collection overhead on every frame. We can avoid this by returning `void` when we do not strictly need a unified promise, or refactoring the method.

Wait! If we don't return a Promise from `setTime`, we cannot append `.then(undefined, noopCatch)`. We can just add `.catch(noopCatch)` inside the driver to the individual CDP promises, and return an already-resolved void promise or change the signature. This avoids the V8 `Promise.all` allocation overhead inside the single-process hot loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.5s
- **Bottleneck analysis**: The cost of executing array allocation and `Promise.all` in the hot loop when the promise is unused by the `CaptureLoop.ts` caller.

## Implementation Spec

### Step 1: Attach catch handlers inline and avoid Promise.all()
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `setTime` method:

```typescript
<<<<<<< SEARCH
  setTime(page: Page, timeInSeconds: number): Promise<void> {
    const frames = this.cachedFrames;

    if (frames.length === 1) {
      this.evaluateParams.expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
      return this.cdpSession!.send('Runtime.evaluate', this.evaluateParams) as Promise<any>;
    }

    const promises = this.cachedPromises;
    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';

    for (let i = 0; i < this.executionContextIds.length; i++) {
      promises[i] = this.cdpSession!.send('Runtime.evaluate', {
        expression: expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      });
    }

    return Promise.all(promises) as unknown as Promise<void>;
  }
=======
  setTime(page: Page, timeInSeconds: number): Promise<void> {
    const frames = this.cachedFrames;

    if (frames.length === 1) {
      this.evaluateParams.expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
      return this.cdpSession!.send('Runtime.evaluate', this.evaluateParams) as Promise<any>;
    }

    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';

    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      }).catch(() => {});
    }

    return Promise.resolve();
  }
>>>>>>> REPLACE
```

**Why**: By attaching a no-op catch handler immediately and avoiding `Promise.all()`, we stop allocating dynamic wrapper promises and save V8 garbage collection overhead inside the hot loop. The caller drops the promise anyway.
**Risk**: If any code begins expecting the multi-frame `setTime` to block execution, it will proceed immediately. But this is exactly what `CaptureLoop` already does (since it doesn't await `setTime`).

## Variations
None.

## Canvas Smoke Test
None needed. SeekTimeDriver is for DOM mode.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to ensure it still runs correctly.
