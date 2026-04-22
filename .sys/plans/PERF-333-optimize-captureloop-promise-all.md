---
id: PERF-333
slug: optimize-captureloop-promise-all
status: unclaimed
claimed_by: ""
created: 2024-04-22
completed: ""
result: ""
---

# PERF-333: Preallocate SeekTime Evaluate Parameters

## Focus Area
The `SeekTimeDriver.ts` hot loop iterates over `executionContextIds` and creates an anonymous object literal `{ expression: expression, contextId: this.executionContextIds[i], awaitPromise: true }` on every frame for every execution context.

## Background Research
In V8, allocating objects in a hot loop triggers garbage collection and increases memory overhead. Previous experiments (PERF-329) showed that preallocating evaluation parameters in `CdpTimeDriver.ts` yielded a ~3.3% performance improvement. Similarly, `SeekTimeDriver.ts` (used for `dom` mode rendering) still performs inline object allocation in the multi-frame CDP `Runtime.evaluate` loop. By preallocating these parameters statically per execution context in an array during initialization, we can eliminate this repeated dynamic allocation.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~39.6s (from recent `CaptureLoop` optimizations)
- **Bottleneck analysis**: CPU overhead in the tight `setTime` loop inside `SeekTimeDriver`, specifically from inline object literal creation inside the CDP `Runtime.evaluate` call loop.

## Implementation Spec

### Step 1: Preallocate execution context evaluate parameters
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add a new property: `private multiFrameEvaluateParams: any[] = [];`
2. In `setTime`, replace the multi-frame inline allocation loop:
   ```typescript
   if (this.multiFrameEvaluateParams.length !== this.executionContextIds.length) {
     this.multiFrameEvaluateParams = this.executionContextIds.map(id => ({
       expression: '',
       contextId: id,
       awaitPromise: true
     }));
   }

   for (let i = 0; i < this.executionContextIds.length; i++) {
     const params = this.multiFrameEvaluateParams[i];
     params.expression = expression;
     this.cdpSession!.send('Runtime.evaluate', params).catch(noopCatch);
   }
   ```
**Why**: Avoids creating dynamic `{ expression, contextId, awaitPromise }` objects on every single frame iteration.
**Risk**: Stale `contextId` if execution contexts change mid-render (extremely rare for static renders). Using a lazily-initialized or length-checked array mitigates this.

## Canvas Smoke Test
Run `npm run test` or targeted tests like `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode still works (SeekTimeDriver is used in DOM mode, but good to be safe).

## Correctness Check
Run the DOM selector verification test: `npx tsx tests/verify-dom-selector.ts` and inspect output to ensure frames still advance correctly.

## Prior Art
- PERF-329: Preallocated `evaluateParams` in `CdpTimeDriver.ts` (~3.3% improvement).
