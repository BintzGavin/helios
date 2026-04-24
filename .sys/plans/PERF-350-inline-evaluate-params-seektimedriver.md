---
id: PERF-350
slug: inline-evaluate-params-seektimedriver
status: unclaimed
claimed_by: ""
created: 2024-06-25
completed: ""
result: ""
---

# PERF-350: Inline Evaluate Params in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` hot loop (`setTime` method).

## Background Research
PERF-348 proved that creating new object literals inside hot loops for Playwright/CDP methods (like `HeadlessExperimental.beginFrame` and `Runtime.evaluate`) is faster than caching and mutating long-lived objects. The Turbofan JIT compiler optimizes inline object allocation efficiently, avoiding the garbage collection write barrier overhead associated with mutating properties of objects that have survived into old space.

While PERF-348 applied this optimization to `DomStrategy.ts` and `CdpTimeDriver.ts`, `SeekTimeDriver.ts` (which is used in `dom` mode rendering) still maintains a cached array of objects `multiFrameEvaluateParams` and mutates them on every frame in a tight loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: Standard resolution, 60 FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.5s - 49.0s
- **Bottleneck analysis**: The `setTime` method is called 600 times (once per frame). Mutating the cached `multiFrameEvaluateParams` objects triggers V8 write barriers, which adds unnecessary overhead to the hot loop compared to simple inline object allocation.

## Implementation Spec

### Step 1: Remove cached params array
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Remove the class property `private multiFrameEvaluateParams: any[] = [];`.
Remove the initialization block inside `setTime`:
```typescript
    if (this.multiFrameEvaluateParams.length !== this.executionContextIds.length) {
      this.multiFrameEvaluateParams = new Array(this.executionContextIds.length);
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameEvaluateParams[i] = { expression: '', contextId: this.executionContextIds[i], awaitPromise: true };
      }
    }
```
**Why**: We no longer need to cache these objects, reducing class complexity and memory footprint.
**Risk**: Minimal, this state is localized to the `setTime` execution logic.

### Step 2: Inline object allocation
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Inside the `for` loop in `setTime`, replace the cached object mutation with inline object creation:
```typescript
<<<<<<< SEARCH
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
**Why**: Avoids V8 GC write barriers on old-space objects and leverages Turbofan's inline allocation optimization, mirroring the successful pattern established in PERF-348.
**Risk**: Negligible. Functional parity is 100% maintained.

## Canvas Smoke Test
Run a basic canvas test (e.g. `npm run test` or targeted tests) to ensure the renderer architecture is unaffected, although this change only touches the DOM-specific `SeekTimeDriver`.

## Correctness Check
Run the DOM mode benchmark script. The resulting `output.mp4` should be visually identical to the baseline, confirming that seeking behavior is maintained across iframes.

## Prior Art
- **PERF-348**: Demonstrated that inline object allocation for `HeadlessExperimental.beginFrame` and `Runtime.evaluate` outperforms mutating cached objects.
