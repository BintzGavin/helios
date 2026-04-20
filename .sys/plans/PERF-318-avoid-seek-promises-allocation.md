---
id: PERF-318
slug: avoid-seek-promises-allocation
status: unclaimed
claimed_by: ""
created: 2024-04-20
completed: ""
result: ""
---

# PERF-318: Avoid Promise Allocation in SeekTimeDriver

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `SeekTimeDriver.ts`

## Background Research
In `SeekTimeDriver.setTime()`, we evaluate a CDP string on each iframe. To track completion of this `Runtime.evaluate`, the driver dynamically allocates an array of Promises and returns `Promise.all(promises)`.

However, inspecting the caller in `CaptureLoop.ts` (`timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);`), we see that the resulting promise is intentionally **not awaited**. The architecture deliberately fires `timeDriver.setTime()` and immediately proceeds to `strategy.capture()`, allowing `Runtime.evaluate` and `HeadlessExperimental.beginFrame` to be pipelined asynchronously on the CDP session.

Because the promise is completely unobserved except for a `.then(undefined, noopCatch)` which catches errors, allocating `Promise.all(promises)` and wrapping it up is pure garbage collection overhead on every frame. We can avoid this by returning a resolved promise or just changing the return behavior to avoid `Promise.all` while directly attaching `.catch()` to individual evaluations.

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

**Why**: By attaching a no-op catch handler immediately and avoiding `Promise.all()`, we stop allocating dynamic wrapper promises and save V8 garbage collection overhead inside the hot loop.
**Risk**: Negligible. Capture loop already drops the returned promise and only attaches an error catcher.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` and `npm test` equivalent on renderer packages if they work.

## Prior Art
- PERF-312
