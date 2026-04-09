---
id: PERF-226
slug: preallocate-seek-promises
status: unclaimed
claimed_by: ""
created: 2024-06-06
completed: ""
result: ""
---

# PERF-226: Optimize promise creation in SeekTimeDriver

## Focus Area
DOM Rendering Pipeline - Virtual Time Advancement in `SeekTimeDriver.ts`.

## Background Research
In `packages/renderer/src/drivers/SeekTimeDriver.ts`, the `window.__helios_seek` function is injected into the Playwright page. This function coordinates virtual time by forcing document animations, the WAAPI timeline, Helios, and media elements to the target time. A key part of the media synchronization waits for `seeked` and `canplay` events by generating a new `Promise` with inline handlers for every media element that requires waiting. The same goes for the safety timeout.

In typical DOM-bound renders, `__helios_seek` is evaluated sequentially on the Chromium browser for each worker and block `capture`. Currently:
```javascript
promises[promises.length] = new Promise((resolve) => {
  let resolved = false;
  // inline closures
});
```
This forces the V8 engine inside the Chromium headless shell to dynamically allocate `Promise` instances and closures in the hot loop, putting pressure on garbage collection. Given that the `CaptureLoop.ts` was refactored in PERF-225 to cache promises using global resolve/reject variables instead of reallocating them and inline closures, applying a similar optimization to the `__helios_seek` logic should further streamline the render cycle by reducing V8 allocations.

Because the page context operates asynchronously with many frames passing before anything else loads, it's safer to pre-compile the `seek()` timeout block and a generic `waitForEvent` helper in the init script, thus preventing inline `new Promise` usage at every invocation.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.89s
- **Bottleneck analysis**: Micro-stalls from GC allocations inside the Chromium V8 isolate due to inline promises created in `__helios_seek`.

## Implementation Spec

### Step 1: Extract inline `Promise` from media sync and timeout blocks
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Update the `__helios_seek` init script to define a global generic `Promise` creator specifically for media events and timeouts, avoiding inline instantiation during `t` iterations:
```javascript
<<<<<<< SEARCH
        // Cache for expensive DOM scans
        let cachedScopes = null;
        let cachedAnimations = null;
        let cachedMediaElements = null;

        window.__helios_invalidate_cache = () => {
=======
        // Cache for expensive DOM scans
        let cachedScopes = null;
        let cachedAnimations = null;
        let cachedMediaElements = null;

        function createMediaPromise(el) {
          return new Promise((resolve) => {
            let resolved = false;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              cleanup();
              resolve();
            };
            const cleanup = () => {
              el.removeEventListener('seeked', finish);
              el.removeEventListener('canplay', finish);
              el.removeEventListener('error', finish);
            };
            el.addEventListener('seeked', finish);
            el.addEventListener('canplay', finish);
            el.addEventListener('error', finish);
          });
        }

        window.__helios_invalidate_cache = () => {
>>>>>>> REPLACE
```

Update the usage of these promises in `__helios_seek`:
```javascript
<<<<<<< SEARCH
              if (el.seeking || el.readyState < 2) {
                if (!promises) promises = [];
                promises[promises.length] = new Promise((resolve) => {
                  let resolved = false;
                  const finish = () => {
                    if (resolved) return;
                    resolved = true;
                    cleanup();
                    resolve();
                  };
                  const cleanup = () => {
                    el.removeEventListener('seeked', finish);
                    el.removeEventListener('canplay', finish);
                    el.removeEventListener('error', finish);
                  };
                  el.addEventListener('seeked', finish);
                  el.addEventListener('canplay', finish);
                  el.addEventListener('error', finish);
                });
              }
=======
              if (el.seeking || el.readyState < 2) {
                if (!promises) promises = [];
                promises[promises.length] = createMediaPromise(el);
              }
>>>>>>> REPLACE
```

*(No change to the timeout logic since the existing code is already simple enough that extracting it into a separate function is unnecessary and creates equivalent GC overhead. Only replacing the complex `Promise` inside the loop for media events.)*

**Why**: Isolates the `new Promise` closures out of the inline hot path (the media `for` loop), allowing V8 to compile the factory function once and reduce GC complexity per frame.
**Risk**: Minimal, functionality remains identical but structured to favor V8 optimization.

## Variations
None.

## Correctness Check
Run `npx tsx packages/renderer/tests/run-all.ts`

## Prior Art
PERF-225 (Cache FFmpeg drain listeners) and PERF-172 (Eliminate closure allocation in hot loop).
