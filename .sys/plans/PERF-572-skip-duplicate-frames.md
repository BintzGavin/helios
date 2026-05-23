---
id: PERF-572
slug: skip-duplicate-frames
status: complete
claimed_by: ""
created: 2024-06-13
completed: ""
result: failed
---

# PERF-572: Skip base64 payload serialization on identical frames

## Focus Area
`DomStrategy.ts` and potentially `CaptureLoop.ts` hot loops.

## Background Research
Currently, Chromium sends a full base64-encoded JPEG/PNG over the CDP socket for every `HeadlessExperimental.beginFrame` call, even if the DOM hasn't changed at all (e.g., during static scenes or paused animations).
This involves:
1. Chromium re-compressing the frame using Skia.
2. Chromium base64 encoding the frame.
3. Playwright receiving a massive JSON payload over IPC.
4. Playwright `JSON.parse`ing the payload.
5. Node.js buffering and piping identical data to FFmpeg.

If we can detect that the visual output hasn't changed (e.g., via a damage rect, a hash, or simply querying Chromium if a paint occurred), we could skip the base64 payload transmission entirely and just reuse the previous frame's buffer.

Chromium's `HeadlessExperimental.beginFrame` has a `hasDamage` return flag. If we can rely on `hasDamage: false` to mean the frame is identical, we can skip the screenshot data entirely if we modify the CDP call to not request a screenshot unless damage is present. However, `beginFrame` currently takes `screenshot` parameters. If we omit the `screenshot` parameter, it doesn't take one. We might need a two-pass approach or find a way to dynamically ask for the screenshot only if damage occurred, or perhaps `beginFrame` naturally omits `screenshotData` if `hasDamage` is false when requested.

A simpler approach: If `screenshotData` is returned but it's identical to the previous frame, we reuse the previous buffer (already done via `lastFrameData`). But the *transfer* cost is the bottleneck.

Hypothesis: If we can dynamically omit the `screenshot` parameter in `beginFrameParams` when we *know* no animations or mutations have occurred (via a DOM mutation observer or a CDP paint event listener), we can bypass the IPC cost.

Alternatively, `beginFrame` might return `hasDamage`. Let's test if `hasDamage` correctly reflects visual changes. If we can use `hasDamage` to avoid decoding/writing new frames, or if we can use a lighter CDP command to check damage before taking the screenshot.

*Revised Hypothesis based on Chromium architecture:*
`HeadlessExperimental.beginFrame` returns `hasDamage` (boolean) and `screenshotData` (string). If we pass `screenshot: undefined`, it doesn't take a screenshot. What if we always pass `screenshot: undefined` and listen for damage, and then only take a screenshot when damage occurs? No, `beginFrame` is deterministic.
Let's experiment with tracking `document.timeline.currentTime` or `requestAnimationFrame` to see if we can statically determine if the page *might* have changed. If not, skip the CDP screenshot request.

Actually, a simpler experiment: We can run `Runtime.evaluate` to check a simple `window.__helios_is_dirty` flag. A `MutationObserver` + `requestAnimationFrame` trap in the browser sets this to `true`. After `setTime`, we check this flag. If `false`, we send `beginFrame` WITHOUT the `screenshot` parameter, avoiding the IPC transfer. If `true`, we send it WITH the `screenshot` parameter, and reset the flag.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.511s (microVM)
- **Bottleneck analysis**: Playwright CDP IPC serialization of base64 images.

## Implementation Spec

### Step 1: Inject Dirty Flag Tracker
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `initScript`, add:
```javascript
window.__helios_is_dirty = true;
const observer = new MutationObserver(() => { window.__helios_is_dirty = true; });
observer.observe(document, { attributes: true, childList: true, subtree: true, characterData: true });
const origRaf = window.requestAnimationFrame;
window.requestAnimationFrame = (cb) => {
    window.__helios_is_dirty = true;
    return origRaf(cb);
};
```
And a helper to check and reset:
```javascript
window.__helios_check_and_reset_dirty = () => {
    const dirty = window.__helios_is_dirty;
    window.__helios_is_dirty = false;
    return dirty;
};
```

### Step 2: Modify Capture to conditionally request screenshot
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify `capture(page, frameTime)` to first evaluate `window.__helios_check_and_reset_dirty()`.
If it returns `false`, call `beginFrame` with `screenshot: null`. The method should then return `this.lastFrameData`.
If it returns `true`, call `beginFrame` with the standard `screenshot` params, and update `this.lastFrameData` with `result.screenshotData`.

**Why**: This will completely bypass the Base64 JSON parsing overhead for frames that haven't visually changed.
**Risk**: `MutationObserver` and `rAF` interception might miss CSS animation ticks, WebGL draws, or Canvas updates. If this happens, animations will freeze. We will evaluate if the performance gain is worth refining the dirty checking mechanism.

## Variations
- **Variation A**: Check `hasDamage` from `beginFrame` without `screenshot` params. If `hasDamage` is true, immediately issue a second `beginFrame` (or `captureScreenshot`) to get the pixels.

## Canvas Smoke Test
Run existing tests. `CanvasStrategy` is unaffected.

## Correctness Check
Watch the output video (`output/example-build/output.mp4`) to ensure animations do not freeze or skip.

## Prior Art
- None explicitly targeting conditional screenshot parameters based on DOM dirtiness.
