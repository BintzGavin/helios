---
id: PERF-309
slug: cache-cdp-promises
status: complete
claimed_by: "executor-session"
created: 2026-04-19
completed: "2024-05-18"
result: "no-improvement"
---

# PERF-309: Cache CDP Synchronization Promises in SeekTimeDriver

## Focus Area
DOM Rendering Pipeline - Virtual Time evaluation optimization in `SeekTimeDriver.ts`.

## Background Research
In `packages/renderer/src/drivers/SeekTimeDriver.ts`, the `setTime` method is called inside the hot loop to advance virtual time for each frame.
Currently, when there are multiple frames (e.g., an iframe is present), we perform a dynamic object allocation to rebuild the Promise array and we also allocate new parameter objects dynamically to evaluate the CDP script for each context ID inside a `for` loop:

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

However, V8 in Node.js incurs garbage collection and allocation overhead every time we create a new literal object (`{ expression, contextId, awaitPromise }`) inside this hot loop, and this happens for every frame being rendered.

By caching the parameter object itself for each execution context inside the TimeDriver instance during the initialization phase, we can avoid dynamically creating a new parameter object for every context on every single frame.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.554s
- **Bottleneck analysis**: Redundant inline object allocations inside the hot loop of `setTime` inside `SeekTimeDriver.ts`.

## Implementation Spec

### Step 1: Preallocate `Runtime.evaluate` Parameter Objects
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Add a new class property `private cachedEvaluateParams: any[] = [];` and initialize it inside `prepare` after gathering execution context IDs.

```typescript
<<<<<<< SEARCH
  private evaluateParams: any = {
    expression: '',
    awaitPromise: true
  };

  constructor(private timeout: number = 30000) {
=======
  private evaluateParams: any = {
    expression: '',
    awaitPromise: true
  };
  private cachedEvaluateParams: any[] = [];

  constructor(private timeout: number = 30000) {
>>>>>>> REPLACE
```

```typescript
<<<<<<< SEARCH
    this.cachedFrames = page.frames();
    this.cachedMainFrame = page.mainFrame();
    this.cachedPromises = new Array(this.executionContextIds.length);
  }
=======
    this.cachedFrames = page.frames();
    this.cachedMainFrame = page.mainFrame();
    this.cachedPromises = new Array(this.executionContextIds.length);
    this.cachedEvaluateParams = this.executionContextIds.map(id => ({
      expression: '',
      contextId: id,
      awaitPromise: true
    }));
  }
>>>>>>> REPLACE
```

Then, use this cached array inside `setTime` instead of allocating an anonymous object:

```typescript
<<<<<<< SEARCH
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
=======
    const promises = this.cachedPromises;
    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
    const params = this.cachedEvaluateParams;

    for (let i = 0; i < this.executionContextIds.length; i++) {
      params[i].expression = expression;
      promises[i] = this.cdpSession!.send('Runtime.evaluate', params[i]);
    }

    return Promise.all(promises) as unknown as Promise<void>;
>>>>>>> REPLACE
```

**Why**: This replaces per-frame dynamic object allocations with property assignments on statically cached objects, reducing V8 GC overhead.
**Risk**: Negligible.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure canvas mode still works.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to verify DOM output is correct.

## Prior Art
`PERF-302` tried preallocating `cdpTimeDriver` parameters and found it to be inconclusive because the anonymous object allocation was efficient enough, but `CdpTimeDriver` single context hot path didn't scale proportionally with iframes. This change specifically targets multi-frame CDP context evaluation where inline allocations compound across frames and `SeekTimeDriver`.

## Results Summary
- **Best render time**: 46.937s (vs baseline ~47.304s)
- **Improvement**: ~0.8% (within noise margin)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-309]
