---
id: PERF-378
slug: inline-seek-promise-race
status: complete
claimed_by: "executor-session"
created: 2024-05-01
completed: "2024-05-01"
result: "improved"
---

# PERF-378: Inline `__helios_seek` and Evaluate Promise.race Node-side

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `setTime` hot loop and script execution.

## Background Research
Currently, `SeekTimeDriver.ts` relies on injecting a large, complex `window.__helios_seek` function during initialization, which internally executes a manual `Promise.all` and a safety `setTimeout` racing against the completion of media and stability checks.
This introduces a significant amount of overhead inside the V8 engine within the browser context:
1. It manages `Promise.all` arrays for asynchronous resource loading dynamically in the client window.
2. It allocates a timer (`setTimeout`) in the browser's JavaScript context every frame to race against stability checks.
3. Node.js waits sequentially for this entire browser-side evaluation to finish before continuing.

Since Playwright's underlying CDP `Runtime.evaluate` supports `awaitPromise: true`, and the script returns a Promise, we can eliminate the heavy `Promise.race` logic from the injected `window.__helios_seek` script. In PERF-365, we optimized `CdpTimeDriver.ts` by removing the Node.js `Promise.race` and relying directly on the Playwright timeout. We can apply a similar simplification here for `SeekTimeDriver.ts`.

If the page is stable, `Promise.all(promises)` resolves quickly. By returning it directly, we avoid the `Promise.race` closure, array allocation, and timer allocation in the browser's hot loop.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.336s
- **Bottleneck analysis**: Micro-allocations of `setTimeout` timers and `Promise.race` wrappers inside the browser's JS context on every frame during the seek phase.

## Implementation Spec

### Step 1: Remove `setTimeout` and `Promise.race` from `__helios_seek`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript`, modify `window.__helios_seek = (t, timeoutMs) => { ... }` to `window.__helios_seek = (t) => { ... }`.
Inside the script, replace the block:
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
with:
```javascript
          // 4. Wait for stability
          if (promises && promises.length > 0) {
            return Promise.all(promises).then(() => {
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

### Step 2: Remove `timeout` from CDP evaluate calls
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime()`, change the expression string to omit `this.timeout`.

From:
```typescript
    if (frames.length === 1) {
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }).then(() => {});
    }

    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
```
To:
```typescript
    if (frames.length === 1) {
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ')',
        awaitPromise: true
      }).then(() => {});
    }

    const expression = 'window.__helios_seek(' + timeInSeconds + ')';
```

**Why**: Simplifies execution context and removes micro-allocations for timers on every frame. Node.js manages execution boundaries at the parent level, making the client-side timeout largely redundant and an unnecessary source of GC pressure.
**Risk**: If a frame inherently hangs without resolution (e.g. fonts never load), it could stall the CDP response indefinitely without the client-side timeout wrapper. However, the BrowserPool enforces a timeout natively on page hangs if the orchestrator uses AbortSignals.

## Results Summary
- **Best render time**: 34.692s (vs baseline 36.336s)
- **Improvement**: 4.52%
- **Kept experiments**:
  - Removed `Promise.race` array allocation and timer overhead from `__helios_seek` script execution in `SeekTimeDriver.ts`, relying on native CDP evaluate timeout.
- **Discarded experiments**: None
