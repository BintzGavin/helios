---
id: PERF-413
slug: dom-parsing
status: complete
claimed_by: "executor"
created: 2026-05-02
completed: ""
result: "improved"
---

# PERF-413: Eliminate DOM Attribute Parsing Overhead in Media Sync

## Focus Area
`packages/renderer/src/utils/dom-scripts.ts` - `SYNC_MEDIA_FUNCTION` and `PARSE_MEDIA_ATTRIBUTES_FUNCTION`.

## Background Research
During rendering, for every frame and for every media element (`<video>`, `<audio>`), the `syncMedia` function is called.
```javascript
  function syncMedia(el, globalTime) {
    const attrs = parseMediaAttributes(el);
    ...
    el.pause();
    el.currentTime = targetTime;
  }
```
This does three expensive things on EVERY frame:
1. Calls `parseMediaAttributes(el)`, which in turn reads `el.dataset` multiple times, calls `parseFloat()` multiple times, and calls `el.getAttribute('playbackRate')`. Reading DOM attributes and parsing floats on every frame adds significant CPU overhead inside Chromium's V8 engine.
2. Calls `el.pause()` unconditionally. Calling a native DOM method crosses the JS-Blink boundary, which is slow, even if the video is already paused.

We can dramatically reduce per-frame overhead by:
1. Caching the parsed attributes on the DOM element object itself (e.g., `el.__helios_attrs`).
2. Only calling `el.pause()` if `!el.paused`.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant DOM string attribute parsing and JS-to-C++ boundary calls (`el.pause()`) on every single frame for every media element.

## Implementation Spec

### Step 1: Cache parsed attributes and avoid redundant pause
**File**: `packages/renderer/src/utils/dom-scripts.ts`
**What to change**:
Modify `PARSE_MEDIA_ATTRIBUTES_FUNCTION` to cache the result:
```javascript
<<<<<<< SEARCH
export const PARSE_MEDIA_ATTRIBUTES_FUNCTION = \`
  function parseMediaAttributes(el) {
    const offset = el.dataset.heliosOffset ? parseFloat(el.dataset.heliosOffset) : 0;
=======
export const PARSE_MEDIA_ATTRIBUTES_FUNCTION = \`
  function parseMediaAttributes(el) {
    if (el.__helios_attrs) return el.__helios_attrs;
    const offset = el.dataset.heliosOffset ? parseFloat(el.dataset.heliosOffset) : 0;
>>>>>>> REPLACE
```
And return the cached object:
```javascript
<<<<<<< SEARCH
    return {
      offset: isNaN(offset) ? 0 : offset,
      seek: isNaN(seek) ? 0 : seek,
      fadeIn: isNaN(fadeIn) ? 0 : fadeIn,
      fadeOut: isNaN(fadeOut) ? 0 : fadeOut,
      volume,
      loop,
      playbackRate: rate,
      duration: (Number.isFinite(duration) && duration > 0) ? duration : undefined
    };
  }
\`;
=======
    el.__helios_attrs = {
      offset: isNaN(offset) ? 0 : offset,
      seek: isNaN(seek) ? 0 : seek,
      fadeIn: isNaN(fadeIn) ? 0 : fadeIn,
      fadeOut: isNaN(fadeOut) ? 0 : fadeOut,
      volume,
      loop,
      playbackRate: rate,
      duration: (Number.isFinite(duration) && duration > 0) ? duration : undefined
    };
    return el.__helios_attrs;
  }
\`;
>>>>>>> REPLACE
```
*(Note: we include duration in the cache here. If the element's duration loads later, it'll still be read directly in `syncMedia` below.)*

Modify `SYNC_MEDIA_FUNCTION` to check `el.paused` and `el.duration`:
```javascript
<<<<<<< SEARCH
export const SYNC_MEDIA_FUNCTION = \`
  function syncMedia(el, globalTime) {
    const attrs = parseMediaAttributes(el);

    // Calculate target time
    // Formula: (GlobalTime - Offset) * Rate + Seek
    let targetTime = Math.max(0, (globalTime - attrs.offset) * attrs.playbackRate + attrs.seek);

    // Handle Looping
    if (attrs.loop && attrs.duration && targetTime > attrs.duration) {
      targetTime = targetTime % attrs.duration;
    }

    el.pause();
    el.currentTime = targetTime;
  }
\`;
=======
export const SYNC_MEDIA_FUNCTION = \`
  function syncMedia(el, globalTime) {
    const attrs = parseMediaAttributes(el);

    // Calculate target time
    // Formula: (GlobalTime - Offset) * Rate + Seek
    let targetTime = Math.max(0, (globalTime - attrs.offset) * attrs.playbackRate + attrs.seek);

    // Handle Looping
    if (attrs.loop && el.duration && targetTime > el.duration) {
      targetTime = targetTime % el.duration;
    }

    if (!el.paused) {
      el.pause();
    }
    el.currentTime = targetTime;
  }
\`;
>>>>>>> REPLACE
```

**Why**: By caching the static `data-helios-*` attributes, we skip multiple property reads and `parseFloat` calls per element per frame. By checking `!el.paused`, we skip an unnecessary Blink C++ method call.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npm run test` to verify no breakages.

## Prior Art
- PERF-408: Cached `findAllMedia(document)` to avoid running `querySelectorAll` on every frame. This continues the trend of moving DOM reads out of the hot loop.
