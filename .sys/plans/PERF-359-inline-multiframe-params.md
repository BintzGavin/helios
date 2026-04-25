---
id: PERF-359
slug: inline-multiframe-params
status: unclaimed
claimed_by: ""
created: 2024-04-25
completed: ""
result: ""
---

# PERF-359: Inline multi-frame `Runtime.evaluate` array params

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `setTime()` multiframe hot loop
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime()` multiframe hot loop

## Background Research
In PERF-348, we replaced long-lived, mutated object properties for single-frame evaluations with inline literal allocations, resulting in a measurable performance improvement due to Turbofan JIT avoiding write barrier overhead for old-space mutations.

However, for multi-frame compositions (compositions using iframes), `SeekTimeDriver` and `CdpTimeDriver` both still cache and mutate an array of parameter objects (`this.multiFrameEvaluateParams`) across frames in the hot loop.

While iframes are less common in benchmarks, maintaining the array cache forces V8 to execute old-space property write barriers on each array element during every single frame evaluation. Since PERF-348 confirmed inline object literal creation is faster than mutation in Playwright/CDP hot loops, the multi-frame path should also eliminate its array cache and instantiate inline literals directly within the loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html` (or one with iframes)
- **Render Settings**: 1920x1080 resolution, 60 FPS, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s (from PERF-348 baseline/results)

## Implementation Spec

### Step 1: Remove `multiFrameEvaluateParams` from `SeekTimeDriver`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove `private multiFrameEvaluateParams: any[] = [];` from the class properties.
2. Update the multi-frame evaluate block in `setTime`:
```typescript
<<<<<<< SEARCH
    if (this.multiFrameEvaluateParams.length !== this.executionContextIds.length) {
      this.multiFrameEvaluateParams = new Array(this.executionContextIds.length);
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameEvaluateParams[i] = { expression: '', contextId: this.executionContextIds[i], awaitPromise: true };
      }
    }

    for (let i = 0; i < this.executionContextIds.length; i++) {
      const params = this.multiFrameEvaluateParams[i];
      params.expression = expression;
      params.contextId = this.executionContextIds[i]; // Update contextId in case it changed
      this.cdpSession!.send('Runtime.evaluate', params).catch(noopCatch);
    }
=======
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      }).catch(noopCatch);
    }
>>>>>>> REPLACE
```

### Step 2: Remove `multiFrameEvaluateParams` from `CdpTimeDriver`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `private multiFrameEvaluateParams: any[] = [];` from the class properties.
2. Update the multi-frame evaluate block in `setTime`:
```typescript
<<<<<<< SEARCH
          const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
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
          const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
          for (let i = 0; i < this.executionContextIds.length; i++) {
            framePromises[i] = this.client!.send('Runtime.evaluate', {
              expression: expression,
              contextId: this.executionContextIds[i],
              awaitPromise: false
            }).catch(this.handleSyncMediaError);
          }
>>>>>>> REPLACE
```

**Why**: Align the multi-frame CDP payload construction with the proven performance gains from single-frame inline object allocations (PERF-348), avoiding array maintenance and write barrier overhead.

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` completes successfully without CDP errors.

## Canvas Smoke Test
Ensure Canvas mode works (since it uses `CdpTimeDriver`).
