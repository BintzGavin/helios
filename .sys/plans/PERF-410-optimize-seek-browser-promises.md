---
id: PERF-410
slug: optimize-seek-browser-promises
status: complete
claimed_by: ""
created: 2026-05-02
completed: ""
result: "failed"
---

# PERF-410: Optimize Promise Allocations in SeekTimeDriver Browser Script

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - injected `window.__helios_seek` browser script.

## Background Research
In `SeekTimeDriver.ts`, an initialization script is injected into every frame. This script exposes `window.__helios_seek`, which is called continuously in the hot loop via Playwright's `Runtime.evaluate`.

Inside `__helios_seek`, it synchronizes animations, fonts, and media, storing any unresolved pending promises in a `cachedPromises` array. It then waits for stability:
```javascript
          // 4. Wait for stability with a safety timeout (only if needed)
          if (cachedPromises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(cachedPromises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            return Promise.race([allReady, timeoutPromise]).then(() => {
              clearTimeout(timeoutId);

              // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
              if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
```
There are two sources of micro-allocations here on every single frame:
1. `Promise.all(cachedPromises)` allocates a new wrapper promise even if `cachedPromises.length === 1` (which is extremely common, e.g., only `helios.waitUntilStable()` is pending).
2. `Promise.race([allReady, timeoutPromise])` allocates an array literal and a new Promise.

By fast-pathing `cachedPromises.length === 1` and replacing `Promise.race` with a native `Promise` wrapper, we eliminate these array and promise allocations on the browser's V8 heap, relieving garbage collection pressure.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~31.85s (from latest journal entries)
- **Bottleneck analysis**: Micro-allocations associated with `Promise.all`, `Promise.race` array literals, and `timeoutPromise` wrappers in the browser script hot loop.

## Implementation Spec

### Step 1: Optimize Promise.all and Promise.race in `initScript`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Update the `initScript` string injected into the browser.

Replace the stability block:
```javascript
          // 4. Wait for stability with a safety timeout (only if needed)
          if (cachedPromises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(cachedPromises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            return Promise.race([allReady, timeoutPromise]).then(() => {
              clearTimeout(timeoutId);

              // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
              if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
```
With the optimized block:
```javascript
          // 4. Wait for stability with a safety timeout (only if needed)
          if (cachedPromises.length > 0) {
            const allReady = cachedPromises.length === 1 ? cachedPromises[0] : Promise.all(cachedPromises);
            return new Promise((resolve, reject) => {
              const timeoutId = setTimeout(resolve, timeoutMs);
              allReady.then(() => {
                clearTimeout(timeoutId);
                resolve();
              }).catch((err) => {
                clearTimeout(timeoutId);
                reject(err);
              });
            }).then(() => {
              // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
              if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
```

**Why**:
- If `cachedPromises.length === 1`, we completely bypass `Promise.all` allocation.
- The single `new Promise` natively handles the timeout and the resolution of `allReady`, completely avoiding `Promise.race` and its array literal allocation `[allReady, timeoutPromise]`.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npm run test` or an equivalent check to verify no breakages.

## Prior Art
- PERF-406: Preallocated the `cachedPromises` array to avoid dynamic array allocation inside this same block.
- PERF-409: Attempted replacing Node.js-side `Promise.race` for stability checks in `CdpTimeDriver.ts`. This applies the same optimization strategy to the browser-side script in `SeekTimeDriver.ts`.

## Duplication Note
IMPOSSIBLE: DUPLICATION. The optimization to eliminate the Promise.race wrapper and optimize the stability timeout logic in the injected script was already implemented and kept by a previous experiment.
