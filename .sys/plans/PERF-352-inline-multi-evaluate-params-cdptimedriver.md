---
id: PERF-352
slug: inline-multi-evaluate-params-cdptimedriver
status: complete
claimed_by: "Jules"
created: 2024-04-24
completed: ""
result: "discarded - performance gain negligible"
---

# PERF-352: Inline Multi-Evaluate Params in CdpTimeDriver

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` hot loop (`setTime` method for multi-frame iframe synchronization).

## Background Research
PERF-348 successfully demonstrated that inline object allocation for Playwright/CDP methods like `HeadlessExperimental.beginFrame` and `Runtime.evaluate` is faster than mutating long-lived cached objects (like `this.evaluateParams`), yielding a ~5% improvement in median render time. This is because V8's Turbofan JIT optimizes short-lived inline literal allocations, avoiding the GC write barrier overhead associated with mutating old-space properties.

In `CdpTimeDriver.ts`, while the single-frame `setTime` path was optimized in PERF-348, the multi-frame (iframe) path still caches and mutates an array of parameter objects (`multiFrameEvaluateParams`). By replacing this array of mutable objects with inline object literals constructed inside the hot loop, we can eliminate the GC write barrier overhead for multi-frame contexts as well.

*Note: A similar attempt (PERF-350) for `SeekTimeDriver.ts` (which evaluates large string scripts) resulted in a regression. However, `CdpTimeDriver.ts` only evaluates a small static string (`"if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"`). Eliminating the `multiFrameEvaluateParams` array mutation here is structurally simpler and aligns with the successful PERF-348 optimization.*

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s (from PERF-348)
- **Bottleneck analysis**: The micro-allocation of V8 GC write barriers during property mutation of long-lived objects (`multiFrameEvaluateParams`) inside the hot loop.

## Implementation Spec

### Step 1: Remove cached params array and inline allocation
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the class property `private multiFrameEvaluateParams: any[] = [];`.
2. In `setTime`, inside the `if (this.executionContextIds.length > 0)` block, remove the initialization logic for `multiFrameEvaluateParams`.
3. Inside the `for` loop, replace the cached object mutation with inline object creation:
```typescript
<<<<<<< SEARCH
          if (this.multiFrameEvaluateParams.length !== this.executionContextIds.length) {
            this.multiFrameEvaluateParams = new Array(this.executionContextIds.length);
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameEvaluateParams[i] = { expression: '', contextId: this.executionContextIds[i], awaitPromise: false };
            }
          }
          for (let i = 0; i < this.executionContextIds.length; i++) {
            const params = this.multiFrameEvaluateParams[i];
            params.expression = expression;
            params.contextId = this.executionContextIds[i]; // Fix: update contextId on each iteration
            framePromises[i] = this.client!.send('Runtime.evaluate', params).catch(this.handleSyncMediaError);
          }
=======
          for (let i = 0; i < this.executionContextIds.length; i++) {
            framePromises[i] = this.client!.send('Runtime.evaluate', {
              expression: expression,
              contextId: this.executionContextIds[i],
              awaitPromise: false
            }).catch(this.handleSyncMediaError);
          }
>>>>>>> REPLACE
```
**Why**: Avoids V8 GC write barriers on old-space objects and leverages Turbofan's inline allocation optimization.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode architecture is unaffected.

## Correctness Check
Run the DOM mode verification script: `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure rendering behavior is maintained.

## Prior Art
- **PERF-348**: Demonstrated that inline object allocation for `Runtime.evaluate` outperforms mutating cached objects in the single-frame path.

## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	45.881	600	13.08	35.6	discard	baseline
2	45.962	600	13.05	39.9	discard	baseline
3	45.897	600	13.07	35.4	discard	baseline
4	45.943	600	13.06	40.8	discard	inline multiFrameEvaluateParams
5	45.762	600	13.11	36.3	discard	inline multiFrameEvaluateParams
6	46.044	600	13.03	35.0	discard	inline multiFrameEvaluateParams
```
