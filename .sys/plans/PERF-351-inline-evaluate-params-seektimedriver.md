---
id: PERF-351
slug: optimize-seektimedriver-gc-overhead
status: unclaimed
claimed_by: ""
created: 2024-06-25
completed: ""
result: ""
---

# PERF-351: Optimize SeekTimeDriver GC Overhead

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` hot loops (`setTime` method and injected browser-side `window.__helios_seek` execution).

## Background Research
This experiment consolidates two distinct but related garbage collection (GC) optimizations inside `SeekTimeDriver.ts` (used primarily during `dom` mode rendering).

1. **Inline Evaluate Parameters (formerly PERF-350)**: PERF-348 proved that creating new object literals inside hot loops for Playwright/CDP methods (like `HeadlessExperimental.beginFrame` and `Runtime.evaluate`) is ~10-15% faster than caching and mutating long-lived objects. Turbofan JIT optimizes inline literal allocations well, avoiding GC write barrier overhead associated with mutating old-space properties. `SeekTimeDriver.ts` still caches and mutates `multiFrameEvaluateParams` on every frame, which can be optimized.
2. **Eliminate Promise.race Array Allocations (formerly PERF-344)**: During single-frame evaluation, the injected `window.__helios_seek` uses `Promise.race([allReady, timeoutPromise])` to wait for stability checks. Every execution allocates a new Array literal `[]` and internal Promise state. By restructuring the logic to manually resolve the race inside a single `Promise` constructor, we eliminate the array allocation and the `Promise.race` wrapper per frame, reducing GC churn inside the browser execution context. This was previously successful in Node-side `CdpTimeDriver` (PERF-343).

By combining these two micro-optimizations, we aim to definitively reduce GC pressure across both the Node.js process and the injected browser context inside the primary renderer hot loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s (from PERF-348 baseline)
- **Bottleneck analysis**: The micro-allocation of V8 GC write barriers during property mutation of long-lived objects, and array allocations for `Promise.race` inside a hot loop, create unnecessary GC pauses.

## Implementation Spec

### Step 1: Remove cached params array and inline allocation
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove the class property `private multiFrameEvaluateParams: any[] = [];`.
2. Remove the initialization block inside `setTime`:
```typescript
    if (this.multiFrameEvaluateParams.length !== this.executionContextIds.length) {
      this.multiFrameEvaluateParams = new Array(this.executionContextIds.length);
      for (let i = 0; i < this.executionContextIds.length; i++) {
        this.multiFrameEvaluateParams[i] = { expression: '', contextId: this.executionContextIds[i], awaitPromise: true };
      }
    }
```
3. Inside the `for` loop in `setTime`, replace the cached object mutation with inline object creation:
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
**Why**: Avoids V8 GC write barriers on old-space objects and leverages Turbofan's inline allocation optimization.

### Step 2: Eliminate `Promise.race` in injected script
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string, inside `window.__helios_seek`:
1. Find `const allReady = Promise.all(promises);` and `const timeoutPromise = new Promise(...)`.
2. Find `return Promise.race([allReady, timeoutPromise]).then(() => { ... })`.
3. Replace this logic to avoid the array allocation:
```javascript
<<<<<<< SEARCH
          if (promises && promises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(promises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            return Promise.race([allReady, timeoutPromise]).then(() => {
              clearTimeout(timeoutId);

              // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
              if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
                try {
                  window.__helios_gsap_timeline__.seek(t);
                } catch (gsapError) {
                  console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
                }
              }

              if (heliosSeeked && typeof window.helios !== 'undefined' && window.helios.seek) {
                try {
                  const helios = window.helios;
                  const fps = helios.fps ? helios.fps.value : 30;
                  const frame = Math.floor(t * fps);
                  helios.seek(frame);
                } catch (e) {
                  console.warn('[SeekTimeDriver] Error seeking Helios:', e);
                }
              }
            });
          }
=======
          if (promises && promises.length > 0) {
            return new Promise((resolve) => {
              let isDone = false;
              let timeoutId;
              const finish = () => {
                if (isDone) return;
                isDone = true;
                clearTimeout(timeoutId);

                // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
                if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
                  try {
                    window.__helios_gsap_timeline__.seek(t);
                  } catch (gsapError) {
                    console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
                  }
                }

                if (heliosSeeked && typeof window.helios !== 'undefined' && window.helios.seek) {
                  try {
                    const helios = window.helios;
                    const fps = helios.fps ? helios.fps.value : 30;
                    const frame = Math.floor(t * fps);
                    helios.seek(frame);
                  } catch (e) {
                    console.warn('[SeekTimeDriver] Error seeking Helios:', e);
                  }
                }

                resolve();
              };

              timeoutId = setTimeout(finish, timeoutMs);
              Promise.all(promises).then(finish);
            });
          }
>>>>>>> REPLACE
```
**Why**: Avoids dynamic array allocation and the internal Promise wrapping overhead of `Promise.race()` inside the browser context for every frame.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode architecture is unaffected.

## Correctness Check
Run the DOM mode verification script: `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure rendering behavior is maintained.

## Prior Art
- **PERF-348**: Demonstrated that inline object allocation for `Runtime.evaluate` outperforms mutating cached objects.
- **PERF-343**: Eliminated `Promise.race` Array Allocation in `CdpTimeDriver`.
