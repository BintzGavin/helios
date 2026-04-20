---
id: PERF-321
slug: avoid-cdp-promise-allocation
status: unclaimed
claimed_by: ""
created: 2024-05-27
completed: ""
result: ""
---

# PERF-321: Avoid CDP Promise Array Allocation in SeekTimeDriver

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `SeekTimeDriver.ts`

## Background Research
In `SeekTimeDriver.setTime()`, when there are multiple execution contexts (e.g., iframes), we allocate an array of Promises and return `Promise.all(promises)`. The caller in `CaptureLoop.ts` does not await this promise (`timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);`).

Because the promise is unobserved except for error catching, allocating `Promise.all()` wrapper and assigning array elements inside the hot loop adds unnecessary GC overhead. This was explored in PERF-312 and PERF-318, but the implementation spec of PERF-318 includes inline anonymous object allocation inside the CDP send loop: `{ expression: expression, contextId: this.executionContextIds[i], awaitPromise: true }`.

To maximize GC reduction, we can combine avoiding `Promise.all()` with preallocating the evaluation parameters object. The `evaluateParams` for multiple contexts can just reuse a single parameter object or be simplified, but since it's an asynchronous send, a preallocated array of parameter objects during `prepare()` is best. Actually, since CDP serialization reads the object synchronously before sending, we can mutate a single shared object during the loop and send it, avoiding even an array of parameter objects! Wait, mutating a single object inside a loop of async sends is safe as long as the CDP client serializes synchronously. Playwright does serialize synchronously. We can reuse `this.evaluateParams`.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html`
- **Render Settings**: Baseline identical settings across all runs, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~51.645s
- **Bottleneck analysis**: Cost of executing array allocation and `Promise.all` in the hot loop when the promise is unused by the `CaptureLoop.ts` caller.

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
      this.evaluateParams.contextId = undefined; // Ensure contextId is removed for main frame
      return this.cdpSession!.send('Runtime.evaluate', this.evaluateParams) as Promise<any>;
    }

    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
    this.evaluateParams.expression = expression;

    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.evaluateParams.contextId = this.executionContextIds[i];
      this.cdpSession!.send('Runtime.evaluate', this.evaluateParams).catch(() => {});
    }

    return Promise.resolve();
  }
>>>>>>> REPLACE
```

**Why**: By attaching a no-op catch handler immediately and avoiding `Promise.all()`, we stop allocating dynamic wrapper promises. Reusing `this.evaluateParams` stops inline object allocation completely.
**Risk**: Playwright `cdpSession.send` might keep a reference to `evaluateParams`. Playwright serializes `evaluateParams` immediately to JSON for the CDP WebSocket, so mutating it synchronously inside the loop is safe. We also need to clear `contextId` on the single-frame path to ensure it doesn't try to use an old `contextId` if it was somehow set before.

## Variations
None.

## Canvas Smoke Test
None needed. SeekTimeDriver is for DOM mode.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure it still runs correctly.

## Prior Art
- PERF-312, PERF-318 (Avoid seek promises allocation but had minor regressions or were left unexecuted, and didn't remove parameter object allocations).
