---
id: PERF-357
slug: eliminate-settimeout-in-seek
status: complete
claimed_by: "executor"
created: 2026-10-18
completed: "2026-04-25"
result: "failed"
---

# PERF-357: Eliminate setTimeout allocation in injected seek script

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `__helios_seek` injected script.

## Background Research
Currently, in `SeekTimeDriver.ts`, the injected script `window.__helios_seek` uses `setTimeout` to enforce a timeout when waiting for stability (`helios.waitUntilStable()` and media loading):
```javascript
          if (promises && promises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(promises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            return Promise.race([allReady, timeoutPromise]).then(() => {
              clearTimeout(timeoutId);
```
However, in `PERF-347`, we removed a similar custom `Promise.race` timeout mechanism on the Node.js side for `CdpTimeDriver.ts` and relied natively on Playwright's CDP `awaitPromise: true` which has an implicit timeout context via the browser execution constraints or by directly supplying a `timeout` parameter to Playwright's native `evaluate` command if we used Playwright directly. Since we are using CDP `Runtime.evaluate` directly in `setTime`, we pass `awaitPromise: true`.
Actually, CDP `Runtime.evaluate` has a `timeout` property natively (in milliseconds). We can pass `timeout: this.timeout` to `Runtime.evaluate` and eliminate the manual `setTimeout`, `Promise.race`, and `clearTimeout` from the injected script, drastically reducing JS object allocations and GC churn within the browser's execution context.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s (from PERF-348)
- **Bottleneck analysis**: Allocating a `new Promise`, calling `setTimeout`, creating a closure for `resolve`, allocating an array `[allReady, timeoutPromise]`, and calling `Promise.race` on *every single frame* within the browser context causes significant V8 GC churn, exactly analogous to what we removed in Node.js via PERF-347.

## Implementation Spec

### Step 1: Remove custom timeout in injected script
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string injected into the browser, modify the end of `window.__helios_seek`:
Change:
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
              // ...
```
To:
```javascript
          // 4. Wait for stability
          if (promises && promises.length > 0) {
            return Promise.all(promises).then(() => {
              // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
              // ...
```
**Why**: Avoids creating closures, arrays, promises, and `setTimeout` timers on every single frame inside the browser's JS context.

### Step 2: Use native CDP timeout
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime`, update the CDP payload to use the `timeout` property natively instead of passing `this.timeout` into the expression.
Change:
```typescript
    if (frames.length === 1) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }).catch(noopCatch);
      return;
    }

    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
```
To:
```typescript
    if (frames.length === 1) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ')',
        awaitPromise: true,
        timeout: this.timeout
      }).catch(noopCatch);
      return;
    }

    const expression = 'window.__helios_seek(' + timeInSeconds + ')';
```
And add `timeout: this.timeout` to the `multiFrameEvaluateParams` initialization. Also change the parameter signature of `window.__helios_seek = (t) => { ... }` in the script to no longer take `timeoutMs`.
**Why**: Leverages Chromium's native timeout mechanism instead of a JavaScript polyfill, reducing overhead.

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` contains 600 correct frames.

## Prior Art
- `PERF-347` proved that removing `Promise.race` and timers for stability checks on the Node side improved performance.
- `PERF-344` tried to eliminate the `Promise.race` in `SeekTimeDriver` but kept the manual `Promise` resolution logic which still allocated objects. This approach uses native CDP timeouts.
