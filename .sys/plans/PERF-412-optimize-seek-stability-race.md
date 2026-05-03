---
id: PERF-412
slug: optimize-seek-stability-race
status: complete
claimed_by: ""
created: 2026-05-02
completed: ""
result: "failed"
---

# PERF-412: Optimize Promise.race Allocation in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - `window.__helios_seek` stability check.

## Background Research
In the `SeekTimeDriver.ts` injected script (`window.__helios_seek`), when checking for media and font stability, the code uses `Promise.race`:

```javascript
const allReady = Promise.all(cachedPromises);
const timeoutPromise = new Promise((resolve) => {
  timeoutId = setTimeout(resolve, timeoutMs);
});
return Promise.race([allReady, timeoutPromise]).then(() => {
  clearTimeout(timeoutId);
```

This allocates an array literal `[allReady, timeoutPromise]` and an additional `timeoutPromise` wrapper on every single frame. We can avoid this allocation by replacing the block with a custom native Promise wrapper that encompasses both the `Promise.all` waiting and the `setTimeout` handling, directly resolving or ignoring the timeout. This builds on the insights from PERF-411.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1280x720, 30fps, dom mode.
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.041s (from journal)
- **Bottleneck analysis**: Micro-allocations associated with `Promise.race` array literal and the `timeoutPromise` on every single frame.

## Implementation Spec

### Step 1: Replace `Promise.race` with Native Wrapper
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string, inside `window.__helios_seek`, modify the stability check block:

```javascript
<<<<<<< SEARCH
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
=======
          // 4. Wait for stability with a safety timeout (only if needed)
          if (cachedPromises.length > 0) {
            return new Promise((resolve) => {
              const timeoutId = setTimeout(resolve, timeoutMs);
              Promise.all(cachedPromises).then(() => {
                clearTimeout(timeoutId);
                resolve();
              });
            }).then(() => {
              // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
>>>>>>> REPLACE
```

**Why**: Eliminates `Promise.race` and the array literal `[allReady, timeoutPromise]` allocation on the V8 heap on every frame, reducing garbage collection pressure.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npm run test` to verify no breakages.

## Prior Art
- PERF-411: Attempted the exact same optimization in CdpTimeDriver.ts.

## Duplication Note
IMPOSSIBLE: DUPLICATION. The optimization to eliminate the Promise.race wrapper and optimize the stability timeout logic in the injected script was already implemented and kept by a previous experiment.
