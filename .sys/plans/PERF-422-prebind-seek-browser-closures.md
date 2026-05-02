---
id: PERF-422
slug: prebind-seek-browser-closures
status: unclaimed
claimed_by: ""
created: 2024-05-02
completed: ""
result: ""
---

# PERF-422: Prebind Closures in SeekTimeDriver Browser Script

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `window.__helios_seek` injected script.

## Background Research
In the `SeekTimeDriver.ts` browser script, which executes roughly 60 times a second inside Chromium, there are two primary sources of dynamic closure allocations that occur when evaluating stability:
1. **Stability Checks**: When waiting for fonts or `helios.waitUntilStable()`, the script allocates a new Promise executor `(resolve, reject) => { ... }`, along with `finish()` and `fail(err)` callback closures that capture local state (`t`, `timeoutMs`, `gsapTimelineSeeked`, etc.).
2. **Media Sync Promises**: When a video or audio element is seeking, `createMediaPromise(el)` allocates a new Promise executor along with `finish()` and `cleanup()` closures.

These micro-allocations within the hot loop add up and trigger unnecessary minor garbage collections in the browser's V8 engine. By caching these closures on the IIFE module scope (for the single-threaded stability check) and on the DOM elements themselves (for the media promises), we can reuse the exact same function objects and eliminate these dynamic allocations entirely, creating a zero-closure execution path for stability checks.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~31.85s
- **Bottleneck analysis**: Micro-allocation of multiple closure functions per frame during stability checks and media synchronization inside the V8 engine.

## Implementation Spec

### Step 1: Lift Stability Closures to IIFE Scope
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript`, above `window.__helios_seek`, declare state variables and the shared closures:
```javascript
        let currentT = 0;
        let currentTimeoutMs = 30000;
        let currentGsapSeeked = false;
        let currentHeliosSeeked = false;
        let currentCachedPromises = null;
        let stabilityDone = false;
        let stabilityTimeoutId = null;
        let stabilityResolve = null;
        let stabilityReject = null;

        const stabilityFinish = () => {
          if (stabilityDone) return;
          stabilityDone = true;
          clearTimeout(stabilityTimeoutId);

          if (currentGsapSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
            try {
              window.__helios_gsap_timeline__.seek(currentT);
            } catch (gsapError) {
              console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
            }
          }

          if (currentHeliosSeeked && typeof window.helios !== 'undefined' && window.helios.seek) {
            try {
              const helios = window.helios;
              const fps = helios.fps ? helios.fps.value : 30;
              const frame = Math.floor(currentT * fps);
              helios.seek(frame);
            } catch (e) {
              console.warn('[SeekTimeDriver] Error seeking Helios:', e);
            }
          }
          if (stabilityResolve) stabilityResolve();
        };

        const stabilityFail = (err) => {
          if (stabilityDone) return;
          stabilityDone = true;
          clearTimeout(stabilityTimeoutId);
          if (stabilityReject) stabilityReject(err);
        };

        const stabilityExecutor = (resolve, reject) => {
          stabilityResolve = resolve;
          stabilityReject = reject;
          stabilityDone = false;
          stabilityTimeoutId = setTimeout(stabilityFinish, currentTimeoutMs);

          if (currentCachedPromises.length === 1) {
            currentCachedPromises[0].then(stabilityFinish, stabilityFail);
          } else {
            Promise.all(currentCachedPromises).then(stabilityFinish, stabilityFail);
          }
        };
```

Update `window.__helios_seek` to use this prebound executor:
```javascript
          // Before the stability check, update state:
          currentT = t;
          currentTimeoutMs = timeoutMs;
          currentGsapSeeked = gsapTimelineSeeked;
          currentHeliosSeeked = heliosSeeked;
          currentCachedPromises = cachedPromises;

          // Replace the inline new Promise(...) block with:
          if (cachedPromises.length > 0) {
            return new Promise(stabilityExecutor);
          }
```

### Step 2: Prebind `createMediaPromise` Closures
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Update the `createMediaPromise` function to cache the executor and finish callback directly on the media element object:
```javascript
        function createMediaPromise(el) {
          if (el.__helios_sync_promise) return el.__helios_sync_promise;

          if (!el.__helios_finish) {
            el.__helios_finish = () => {
              if (el.__helios_resolved) return;
              el.__helios_resolved = true;
              el.removeEventListener('seeked', el.__helios_finish);
              el.removeEventListener('canplay', el.__helios_finish);
              el.removeEventListener('error', el.__helios_finish);
              el.__helios_sync_promise = null;
              if (el.__helios_resolve) el.__helios_resolve();
            };
            el.__helios_executor = (resolve) => {
              el.__helios_resolved = false;
              el.__helios_resolve = resolve;
              el.addEventListener('seeked', el.__helios_finish);
              el.addEventListener('canplay', el.__helios_finish);
              el.addEventListener('error', el.__helios_finish);
            };
          }

          el.__helios_sync_promise = new Promise(el.__helios_executor);
          return el.__helios_sync_promise;
        }
```

**Why**: This safely moves all dynamic closures to the global context or element cache. Since Playwright frames strictly execute sequentially inside the actor model pipeline, shared state like `currentT` is entirely safe and guarantees no race conditions.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npm run test` to verify no breakages.

## Correctness Check
Run the standard pipeline test to ensure frames render correctly without hanging.

## Prior Art
- PERF-421: Prebound `drainPromiseExecutor` on the Node.js side in `CaptureLoop.ts`.
- PERF-406: Optimized other V8 micro-allocations in this exact same script block.
