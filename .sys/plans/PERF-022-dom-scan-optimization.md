---
id: PERF-022
slug: dom-scan-optimization
status: unclaimed
claimed_by: ""
created: 2026-03-21
completed: ""
result: ""
---

# PERF-022: Optimize Expensive DOM Scans in SeekTimeDriver

## Context & Goal
The Frame Capture Loop (phase 4) dominates DOM render time. During each frame capture, `SeekTimeDriver` triggers the time synchronization logic. Inside this logic, it searches for all scopes and all media elements in the page, including within shadow DOMs. The search logic traverses the entire DOM tree using `document.createTreeWalker` on every single frame. This redundant scanning of the entire document on every frame is extremely expensive and wastes CPU cycles, as the media elements and scopes rarely change between frames.

By caching the results of these DOM scans during the first frame (or providing a way to invalidate the cache if needed, though for standard renders the structure is mostly static), we can eliminate the traversal overhead and significantly reduce the time spent in time synchronization logic per frame.

The current estimated render time is ~34.4 seconds. The bottleneck analysis points to CPU overhead from repeatedly scanning the DOM for media elements and scopes on every frame.

## File Inventory
- `packages/renderer/src/drivers/SeekTimeDriver.ts`

## Implementation Spec

### Step 1: Cache Scopes and Media Elements in SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Modify the `initScript` string injected into the page. Introduce a global variable to cache the result of the DOM scans for scopes and media elements. Check if this cache exists at the beginning of the time synchronization logic. If it doesn't, perform the scans and store the results. In subsequent calls, reuse the cached arrays.
**Why**: This reduces the DOM traversal cost from `O(N)` per frame (where N is the number of nodes) to `O(N)` just once, and `O(1)` for subsequent frames.
**Risk**: If a composition dynamically adds or removes `<video>`, `<audio>` elements or shadow roots after the first frame, they might not be synchronized. This is a rare edge case for Helios compositions, but if required, we could add a `window.__helios_invalidate_cache()` helper or listen to DOM mutations.

## Test Plan
Run a standard Canvas smoke test using `npx tsx packages/renderer/tests/verify-codecs.ts`. Run the DOM rendering benchmark using `npx tsx packages/renderer/scripts/render-dom.ts` and inspect the output video visually to ensure no frames are dropped or torn, and measure the wall-clock render time.
