---
id: PERF-448
slug: cdptimedriver-skip-media-sync
status: unclaimed
claimed_by: ""
created: 2026-05-06
completed: ""
result: ""
---

# PERF-448: Skip Media Sync CDP Call in CdpTimeDriver When No Media Exists

## Focus Area
`CdpTimeDriver.ts` hot loop (`runSetTime`).

## Background Research
Currently, `CdpTimeDriver` makes three separate CDP calls per frame:
1. `Runtime.evaluate` for media synchronization (`window.__helios_sync_media`).
2. `Emulation.setVirtualTimePolicy` to advance virtual time.
3. `Runtime.evaluate` for stability checks (`window.__helios_wait_until_stable`).

Most compositions (like standard DOM or Canvas animations) do not contain `<video>` or `<audio>` elements. However, the media synchronization fire-and-forget CDP call is still dispatched unconditionally on every frame. Since the injected `__helios_sync_media` script already caches the discovered media elements on the first execution, we can safely evaluate the presence of media elements once during `prepare()`. If no media elements exist across all frames, we can completely bypass the `sync_media` CDP call in the `runSetTime` hot loop. This reduces the per-frame CDP IPC traffic by 33% (from 3 calls to 2) and avoids unnecessary V8 string parsing on every frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (`dom-benchmark`)
- **Render Settings**: 1280x720, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.5s
- **Bottleneck analysis**: IPC overhead and V8 string parsing for unnecessary `Runtime.evaluate` calls in the per-frame capture loop.

## Implementation Spec

### Step 1: Update Injected Script to Return Media Count
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `prepare()`, modify the `__helios_sync_media` function inside `initScript` to return the number of media elements discovered:
```javascript
        window.__helios_sync_media = (t) => {
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          const numMedia = cachedMediaElements.length;
          for (let i = 0; i < numMedia; i++) {
            syncMedia(cachedMediaElements[i], t);
          }
          return numMedia; // <-- Add this return statement
        };
```
**Why**: Allows the Node.js environment to determine if the page actually contains media.

### Step 2: Evaluate Media Presence During Setup
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a private flag: `private hasMedia: boolean = true;`.
At the end of `prepare()`, after `this.cachedFrames = page.frames();`, evaluate the media presence:
```typescript
    try {
      this.hasMedia = false;
      for (const frame of this.cachedFrames) {
         const count = await frame.evaluate(() => {
            if (typeof (window as any).__helios_sync_media === 'function') {
               return (window as any).__helios_sync_media(0);
            }
            return 0;
         });
         if (count > 0) {
            this.hasMedia = true;
            break;
         }
      }
    } catch (e) {
      this.hasMedia = true;
    }
```
**Why**: We perform the check once during initialization, keeping the hot loop clean of first-frame conditionals. Calling it with `t=0` safely initializes the `cachedMediaElements` array within the page.

### Step 3: Skip Media Sync Call in Hot Loop
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime()`, wrap the entire media synchronization block (Step 1 of the loop) in an `if (this.hasMedia)` check:
```typescript
    // 1. Synchronize media elements (video, audio)
    if (this.hasMedia) {
      const frames = this.cachedFrames;
      if (frames.length === 1) {
          // ... existing single frame logic ...
      } else {
          // ... existing multi frame logic ...
      }
    }
```
**Why**: Completely bypasses the CDP `Runtime.evaluate` IPC call when no media is present.
**Risk**: None. Dynamic media injection is already unsupported due to the `if (!cachedMediaElements)` singleton caching pattern in the existing script.

## Variations
None.

## Canvas Smoke Test
Run benchmark script to ensure canvas and dom modes still function correctly.

## Correctness Check
Run the `npm run test` suite for the renderer.

## Prior Art
PERF-408: "Cache Media Elements in CdpTimeDriver to avoid per-frame DOM scans." (We are building upon this by extending the cache logic to the Node.js process).
