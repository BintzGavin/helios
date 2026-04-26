---
id: PERF-361
slug: avoid-promise-race-in-seek
status: complete
claimed_by: "executor-session"
created: 2024-06-05
completed: "2026-04-26"
result: "discarded - slower (48.761s vs 46.298s baseline)"
---

# PERF-361: Avoid Promise.race allocation in SeekTimeDriver injected script

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - injected `window.__helios_seek` script.

## Background Research
Currently, inside the `window.__helios_seek` function injected by `SeekTimeDriver`, when asynchronous tasks like fonts, media, or `window.helios.waitUntilStable()` are detected, they are pushed into a `promises` array. Then, the script does:
```javascript
            let timeoutId;
            const allReady = Promise.all(promises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            return Promise.race([allReady, timeoutPromise]).then(() => {
              clearTimeout(timeoutId);
```
This forces the browser to allocate a new `Promise` (for the timeout) and a new array for `Promise.race`, as well as a wrapper Promise, on every frame where stability checks are present. `PERF-357` attempted to remove the `setTimeout` and rely on `Runtime.evaluate` timeout, but that was slower and caused CDP instability. `PERF-351` attempted to replace `Promise.race` with a custom inline Promise but regressed performance because allocating complex inline objects in the driver was slower.

However, a simpler, more performant way to implement a timeout without allocating a `timeoutPromise` and `Promise.race` array on every execution is to use a manual wrapper promise that races the `allReady` promise and the timeout directly:

```javascript
          if (promises && promises.length > 0) {
            return new Promise((resolve) => {
              let isDone = false;
              const finish = () => {
                if (isDone) return;
                isDone = true;
                clearTimeout(timeoutId);

                // 5. After stability...
                // ...
                resolve();
              };

              const timeoutId = setTimeout(finish, timeoutMs);
              Promise.all(promises).then(finish);
            });
          }
```
This eliminates `Promise.race([...])` and the `timeoutPromise` allocation, keeping the code simple and lightweight within the V8 context. It reduces GC churn for Promise resolution inside the browser environment during every stability check.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s (from PERF-348)
- **Bottleneck analysis**: Micro-allocation of `Promise.race` arrays and redundant `timeoutPromise` objects inside the injected browser script on every frame.

## Implementation Spec

### Step 1: Optimize `Promise.race` to a single Promise
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `window.__helios_seek` function, locate:
```javascript
          // 4. Wait for stability with a safety timeout (only if needed)
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
```

Replace it with:
```javascript
          // 4. Wait for stability with a safety timeout (only if needed)
          if (promises && promises.length > 0) {
            return new Promise((resolve) => {
              let isDone = false;
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

              const timeoutId = setTimeout(finish, timeoutMs);
              Promise.all(promises).then(finish);
            });
          }
```

**Why**: Avoids `Promise.race` and the creation of an intermediate `timeoutPromise` and array wrapper. V8 creates fewer objects and promises per frame when stability checks are active, leading to faster frame turnaround inside the browser.
**Risk**: Functionally identical. No risk.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -- tests/verify-canvas-strategy.ts` to ensure Canvas mode is unaffected.

## Correctness Check
Run `npm run test -- tests/verify-dom-strategy-capture.ts` to ensure DOM output continues to correctly encode PNGs and fallback to cached frames without crashing.


## Results Summary
- **Best render time**: 48.761s (vs baseline 46.298s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-361]
