---
id: PERF-331
slug: preallocate-seektime-evaluate-params
status: unclaimed
claimed_by: ""
created: 2026-04-22
completed: ""
result: ""
---

# PERF-331: Preallocate SeekTimeDriver multi-frame evaluate params

## Focus Area
`SeekTimeDriver.ts` hot loop - DOM Strategy frame synchronization.
Targets the dynamic memory allocation of the `Runtime.evaluate` parameter object in the multi-iframe evaluation branch to reduce garbage collection churn across execution contexts.

## Background Research
In the multi-iframe fallback branch of `SeekTimeDriver.setTime()`, the code evaluates the virtual time synchronization script across all tracked execution contexts. Currently, it dynamically allocates a new object literal (`{ expression, contextId, awaitPromise: true }`) for every execution context on every single frame tick. For a DOM composition with 3 iframes at 60fps, this creates 180 short-lived objects per second per worker.

In `CdpTimeDriver.ts`, PERF-329 demonstrated a ~3.3% rendering improvement by preallocating evaluate parameters into a statically sized array (`multiFrameEvaluateParams`) and merely updating the mutable `contextId` and `expression` properties to prevent V8 from churning these short-lived objects. Applying this same pattern to `SeekTimeDriver.ts` aligns the two drivers and removes unnecessary memory allocations from the hot loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds, `libx264`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.034s (Based on recent PERF-330 results)
- **Bottleneck analysis**: The inline literal object allocation inside the multi-frame loop creates V8 garbage collection pressure, competing with other hot-loop operations.

## Implementation Spec

### Step 1: Add preallocated params array property
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Add a new private property to cache the evaluate parameters per execution context:
```typescript
  private multiFrameEvaluateParams: any[] = [];
```
**Why**: Provides a static array to hold reusable parameter objects.

### Step 2: Mutate cached parameters in the multi-frame branch
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime()`, locate the `for` loop that iterates over `this.executionContextIds`.

Replace the loop body with logic that populates/resizes the `multiFrameEvaluateParams` array to match the current execution context length, and then mutates the `contextId` before passing it:

```typescript
    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';

    if (this.multiFrameEvaluateParams.length !== this.executionContextIds.length) {
      this.multiFrameEvaluateParams = new Array(this.executionContextIds.length);
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameEvaluateParams[i] = { expression: '', contextId: this.executionContextIds[i], awaitPromise: true };
      }
    }

    for (let i = 0; i < this.executionContextIds.length; i++) {
      const params = this.multiFrameEvaluateParams[i];
      params.expression = expression;
      params.contextId = this.executionContextIds[i]; // Defensive update in case ids changed order
      this.cdpSession!.send('Runtime.evaluate', params).catch(noopCatch);
    }
```
**Why**: Avoids creating a new literal object on every iteration of every frame for every execution context.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas isn't affected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM frames continue to correctly advance via CDP evaluation.
