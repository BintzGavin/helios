---
id: PERF-408
slug: cache-media-elements-cdp
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-408: Cache Media Elements in CdpTimeDriver to avoid per-frame DOM scans

## Focus Area
`CdpTimeDriver.ts`'s injected script `window.__helios_sync_media`.

## Background Research
During execution of `CdpTimeDriver.setTime()`, the driver executes `window.__helios_sync_media(time)` in the browser to synchronize video/audio tags to the current virtual time. Currently, the injected script implements this function as:
```javascript
        window.__helios_sync_media = (t) => {
          const mediaElements = findAllMedia(document);
          mediaElements.forEach((el) => {
            syncMedia(el, t);
          });
        };
```
This forces `findAllMedia(document)` to run on every single frame capture. `findAllMedia` queries the DOM for all `<video>` and `<audio>` elements. In a 60fps render, scanning the entire DOM 60 times a second creates significant CPU overhead within the Chromium process, blocking the compositor and increasing the `Runtime.evaluate` execution time.

In `SeekTimeDriver.ts`, this was previously optimized by introducing a `cachedMediaElements` array that persists across frames. We should apply the identical caching strategy to `CdpTimeDriver.ts` to eliminate the per-frame DOM scan bottleneck.

## Benchmark Configuration
- **Composition URL**: Any standard DOM test, especially ones with a large number of DOM elements.
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Profiling shows `findAllMedia` is evaluated on every frame in `CdpTimeDriver`, taking CPU time inside the Chromium renderer thread.

## Implementation Spec

### Step 1: Cache `findAllMedia` Result in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Update the `initScript` string injected into the page inside the `prepare` method to cache the media elements.
```javascript
        let cachedMediaElements = null;

        window.__helios_invalidate_cache = () => {
          cachedMediaElements = null;
        };

        window.__helios_sync_media = (t) => {
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          const numMedia = cachedMediaElements.length;
          for (let i = 0; i < numMedia; i++) {
            syncMedia(cachedMediaElements[i], t);
          }
        };
```
**Why**: Avoids querying the DOM on every single frame, significantly reducing the CPU overhead of `window.__helios_sync_media`. Replacing `.forEach` with a standard `for` loop also avoids allocating a closure on every frame per media element.
**Risk**: If the DOM changes and new media elements are added dynamically, they won't be synced unless `__helios_invalidate_cache` is called. However, Helios compositions generally do not add `<video>` tags asynchronously mid-render, and this identical caching logic is already proven stable in `SeekTimeDriver.ts`.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npx tsx tests/verify-codecs.ts`.

## Correctness Check
Run targeted script `cd packages/renderer && npx tsx tests/verify-cdp-media-sync-timing.ts`.
