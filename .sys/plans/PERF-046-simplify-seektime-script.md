---
id: PERF-046
slug: simplify-seektime-script
status: complete
claimed_by: "executor-session"
created: 2024-05-28
completed: 2025-05-28
result: "kept"
---

# PERF-046: Fast-path for Synchronous Animations in SeekTimeDriver

## Focus Area
DOM Rendering Frame Capture Overhead. The `window.__helios_seek` function injected by `SeekTimeDriver` handles numerous asynchronous edge cases (e.g. video/audio media seeking, fonts loading) using promises and a fallback timeout mechanism. Un-cleared timeouts and redundant DOM traversal checks can add constant overhead to every frame evaluation.

## Background Research
The `window.__helios_seek` script synchronizes all DOM animations. In compositions without media elements or external font loads, the promise array remains empty, yet it still executes checking loops (`findAllScopes`, `findAllMedia`) and sets up a `Promise.race` check with a timeout on every single frame. If we can introduce a fast-path that bypasses unnecessary synchronous DOM scans and promise allocations when we know the composition has no media or external async requirements, we can shave precious milliseconds off the evaluation time of each frame.

Currently, `window.__helios_seek` is evaluated via CDP:
```javascript
  // 4. Wait for stability with a safety timeout (only if needed)
  if (promises.length > 0) {
    const allReady = Promise.all(promises);
    const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    await Promise.race([allReady, timeout]);
  }
```

Even when `promises.length === 0`, the script iterates over elements, calls `document.fonts.ready` at frame 0, and runs several try/catch blocks for Helios and GSAP.

A significant optimization would be to structure `__helios_seek` such that if there's no media or special wait condition, it simply returns immediately after updating `anim.currentTime` and the timeline state.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/output/build/composition.html`
- **Render Settings**: 1280x720, 30fps, 150 frames (5 seconds), mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: IPC overhead of `Runtime.evaluate` executing a complex Javascript function `window.__helios_seek` per frame.

## Implementation Spec

### Step 1: Optimize window.__helios_seek execution flow
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Use `read_file` to review `packages/renderer/src/drivers/SeekTimeDriver.ts`. Modify the `initScript` string defining `window.__helios_seek` to streamline the execution path.
Specifically:
- Check if `document.fonts.ready` check is only needed at `t === 0` (it already is).
- Change the `Promise.race` block to properly clean up the `setTimeout`:
```javascript
          if (promises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(promises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            await Promise.race([allReady, timeoutPromise]);
            clearTimeout(timeoutId);
          }
```
**Why**: Avoids creating a floating timeout timer in the V8 event loop on frames that require waiting, and prevents scanning the DOM for media elements on every frame if none exist.
**Risk**: Very low. Cleaning up timeouts is best practice, and skipping empty media arrays avoids redundant checks.

### Step 2: Skip Media Scan if Empty
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `initScript`'s `window.__helios_seek`:
```javascript
          if (!cachedMediaElements) {
            cachedMediaElements = findAllMedia(document);
          }
          if (cachedMediaElements.length > 0) {
            for (let i = 0; i < cachedMediaElements.length; i++) {
              const el = cachedMediaElements[i];
              syncMedia(el, t);
              // ... existing seeking logic
            }
          }
```
**Why**: Avoids entering the loop structure entirely.

## Variations

### Variation A: Inline Promise Checks
If possible, pre-allocate the promises array and use an index counter instead of `promises.push()` to further avoid allocation overhead.

## Canvas Smoke Test
Run `npx vitest run packages/cli/src/commands/components.test.ts` to ensure everything is stable.

## Correctness Check
Run the render script locally to verify `output/test-output.mp4`. Ensure that frame times advance correctly.

## Prior Art
Event loop bloat from un-cleared `setTimeout` calls is a known issue in V8, particularly when executed repeatedly in a tight loop like rendering.

## Results Summary
- **Best render time**: 33.615s (vs baseline 33.657s)
- **Improvement**: ~0.1% (within noise margin)
- **Kept experiments**: Fast-path for Synchronous Animations in SeekTimeDriver
- **Discarded experiments**: []
