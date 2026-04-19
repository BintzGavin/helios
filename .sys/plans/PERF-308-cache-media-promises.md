---
id: PERF-308
slug: cache-media-promises
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-308: Cache Media Synchronization Promises in SeekTimeDriver

## Focus Area
DOM Rendering Pipeline - Media Synchronization in `SeekTimeDriver.ts`.

## Background Research
In `packages/renderer/src/drivers/SeekTimeDriver.ts`, the `__helios_seek` function synchronizes media elements (video/audio). For any element that is currently seeking or not ready (`readyState < 2`), it calls `createMediaPromise(el)` and pushes the promise onto an array to wait for stability.

Currently, `createMediaPromise(el)` allocates a *new* `Promise` and binds three *new* event listeners (`seeked`, `canplay`, `error`) every single time it is called. Since `__helios_seek` runs on every single frame, if a video takes several frames to become ready, we are instantiating many redundant promises and attaching duplicate event listeners to the same element. This causes unnecessary V8 GC allocation pressure and event listener pileups in the Chromium isolate.

By caching the pending promise directly on the DOM element (`el.__helios_sync_promise`) and returning it on subsequent frames until it resolves, we can eliminate the redundant object allocations and duplicate listeners entirely.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.554s
- **Bottleneck analysis**: Redundant `Promise` allocations and event listener bindings inside the Chromium V8 isolate during media synchronization waits.

## Implementation Spec

### Step 1: Cache the Promise on the Media Element
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Modify the `createMediaPromise` function inside the `initScript` string to check for and cache the promise on the element:

```javascript
<<<<<<< SEARCH
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
=======
        function createMediaPromise(el) {
          if (el.__helios_sync_promise) return el.__helios_sync_promise;

          el.__helios_sync_promise = new Promise((resolve) => {
            let resolved = false;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              cleanup();
              el.__helios_sync_promise = null;
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

          return el.__helios_sync_promise;
        }
>>>>>>> REPLACE
```
**Why**: Prevents allocating a new Promise and attaching new event listeners on every frame while the media element is still seeking or buffering.
**Risk**: If an error occurs and the element state becomes permanently invalid, the cached promise might hang if not properly rejected/cleaned up, but the existing error listener mitigates this by calling `finish` (which clears the cache).

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure canvas mode still works.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to verify DOM output is correct.

## Prior Art
PERF-226 originally suggested extracting `new Promise` but the current code creates a new instance inside the extracted function. This plan builds upon PERF-226 by preventing redundant instances.
