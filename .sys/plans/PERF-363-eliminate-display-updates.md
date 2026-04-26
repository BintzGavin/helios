---
id: PERF-363
slug: eliminate-display-updates
status: complete
claimed_by: "executor-session"
created: 2026-10-18
completed: "2024-05-18"
result: "failed"
---

# PERF-363: Optimize HeadlessExperimental.beginFrame by eliminating display updates

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture` loop.

## Background Research
The `HeadlessExperimental.beginFrame` CDP command accepts a `noDisplayUpdates` parameter. According to Chrome DevTools Protocol documentation, when `noDisplayUpdates` is `true`, it avoids issuing a display frame to the screen (so it skips drawing to the screen's output buffer and possibly some vsync alignment overhead), but it can still yield a `screenshotData` payload if a screenshot is requested. This directly bypasses unneeded rendering work when running in headless mode, optimizing capture throughput.

A quick test proves that passing `noDisplayUpdates: true` works correctly in our Playwright headless environment as long as `--run-all-compositor-stages-before-draw` is active (which it already is in `BrowserPool.ts` `DEFAULT_BROWSER_ARGS`), and it yields about a ~2.3% improvement in a raw synthetic test (2723ms vs 2788ms for 100 frames).

Applying this to our `DomStrategy` capture path could eliminate unnecessary compositor overhead per-frame.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.036s
- **Bottleneck analysis**: During `HeadlessExperimental.beginFrame`, the Chromium compositor still executes full display update logic, which is unnecessary when we only need the off-screen screenshot buffer.

## Implementation Spec

### Step 1: Modify CDP screenshot params to include `noDisplayUpdates: true`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, when calling `HeadlessExperimental.beginFrame`, add `noDisplayUpdates: true` to the parameters object.

Current:
```typescript
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
      screenshot: this.cdpScreenshotParams,
      interval: this.frameInterval,
      frameTimeTicks: 10000 + frameTime
    });
```
Update to:
```typescript
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
      screenshot: this.cdpScreenshotParams,
      interval: this.frameInterval,
      noDisplayUpdates: true,
      frameTimeTicks: 10000 + frameTime
    });
```
And do the same for the `this.targetClipParams` fallback path.

**Why**: By skipping the final display update swap in the Chromium compositor, we save CPU cycles per frame inside the Jules microVM.
**Risk**: If some obscure animation or WebGL context relies on actual display buffer swaps to advance, it might break. The `Canvas Smoke Test` and `Correctness Check` will verify this.

## Variations
None.

## Canvas Smoke Test
Run generic canvas mode to ensure shared configuration holds. (N/A here, but standard).

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` contains 600 correct frames.

## Results Summary
- **Best render time**: N/A (baseline ~47.59s)
- **Improvement**: -
- **Kept experiments**: []
- **Discarded experiments**: [PERF-363-eliminate-display-updates]
