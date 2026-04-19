---
id: PERF-311
slug: remove-multi-frame-promise-all
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---
# PERF-311: Optimize Multi-Frame Seek Execution in SeekTimeDriver

## Focus Area
DOM Rendering Frame Capture Loop. This targets the hot `setTime` multi-frame logic inside `SeekTimeDriver.ts`.

## Background Research
Currently, Playwright CDP sends string expressions to the browser to evaluate in different execution contexts. We wrap `this.cdpSession!.send('Runtime.evaluate')` inside an array and return `Promise.all(promises)`. However, `CaptureLoop.ts` does NOT await it, and ignores any returned errors using `.then(undefined, noopCatch)`.
Because `CaptureLoop` does not await `setTime()` anyway (to allow CDP pipelining), using `Promise.all` forces V8 to allocate the array, create new internal tracking objects, and allocate a combined Promise, which is then immediately discarded. By removing `Promise.all` and simply returning a resolved promise after issuing the CDP commands synchronously (and attaching an empty `.catch()` to the internal `send` promises to avoid unhandled rejections), we can eliminate this redundant allocation and execution tracking inside the multi-frame hot loop.

## Benchmark Configuration
- **Composition URL**: Any multi-frame composition (Executor will build and locate one using `npm run build:examples`)
- **Render Settings**: Standard benchmark settings (600x600, 30fps)
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 47.554s (Baseline render time for DOM mode)
- **Bottleneck analysis**: Unnecessary `Promise.all` object allocation, tracking, and resolution overhead per frame for un-awaited execution contexts.

## Implementation Spec

### Step 1: Remove `Promise.all` allocation from `SeekTimeDriver` multi-frame path
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `SeekTimeDriver.setTime()`, find the loop block:
```typescript
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
```
And replace it with:
```typescript
    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';

    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      }).catch(() => {});
    }

    return Promise.resolve();
```
(You can also remove `this.cachedPromises` tracking logic entirely if it's no longer used).
**Why**: Avoids `Promise.all` array allocations and internal Promise tracker creation for un-awaited CDP executions in multi-frame contexts.
**Risk**: Very minimal. `CaptureLoop` explicitly ignores the return of `setTime()` to prioritize CDP pipelining, so it doesn't await completion anyway.

## Correctness Check
Run the DOM render script and verify output exists and has valid video contents.

## Variations
None.
