---
id: PERF-366
slug: remove-domstrategy-target-begin-frame
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-366: Remove target-specific beginFrame logic in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` single-frame capture hot loop.

## Background Research
Currently, when `DomStrategy` is capturing a specific `targetSelector`, it attempts to capture the screenshot via `HeadlessExperimental.beginFrame` with a `clip` parameter first:
```typescript
      if (this.targetClipParams) {
        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
          screenshot: {
            format: this.cdpScreenshotParams.format,
            quality: this.cdpScreenshotParams.quality,
            clip: this.targetClipParams
          } as any,
          interval: this.frameInterval,
          frameTimeTicks: 10000 + frameTime
        });
        // ...
      }
```
If `this.targetClipParams` is not available, it falls back to Playwright's native `targetElementHandle.screenshot()`.

However, providing `clip` to `HeadlessExperimental.beginFrame` is historically known to be slower or broken in headless environments compared to a full-page capture and manual crop or just relying on Playwright's `element.screenshot()`. More importantly, branching in the hot loop just to support a `clip` based `beginFrame` versus standard `beginFrame` versus `element.screenshot()` creates unnecessary complexity.

If we simply always use `targetElementHandle.screenshot()` when a `targetSelector` is specified, we bypass the need to query the bounding box, store `targetClipParams`, and execute the `clip`-based `beginFrame` logic. For full page renders (the vast majority of use cases), it uses the optimized `beginFrame` path anyway.

Let's test removing the `targetClipParams` logic entirely and relying solely on `targetElementHandle.screenshot()` when targeting a specific element. Since benchmark compositions generally don't use `targetSelector`, the main benefit here is structural simplification of the hot loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s
- **Bottleneck analysis**: Unnecessary branch evaluation and CDP parameter preparation in the `capture` method for `targetClipParams`.

## Implementation Spec

### Step 1: Remove `targetClipParams`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove `private targetClipParams: any = null;` class property.
2. In `prepare()`, remove the bounding box logic:
```typescript
<<<<<<< SEARCH
      const box = await this.targetElementHandle.boundingBox();
      if (box) {
        this.targetClipParams = { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 };
      } else {
        console.warn(`Could not determine bounding box for target element: ${this.options.targetSelector}`);
      }
=======
>>>>>>> REPLACE
```
3. In `capture()`, remove the `if (this.targetClipParams)` block entirely:
```typescript
<<<<<<< SEARCH
    if (this.targetElementHandle) {
      if (this.targetClipParams) {
        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
          screenshot: {
            format: this.cdpScreenshotParams.format,
            quality: this.cdpScreenshotParams.quality,
            clip: this.targetClipParams
          } as any,
          interval: this.frameInterval,
          frameTimeTicks: 10000 + frameTime
        });
        if (res && res.screenshotData) {
          this.lastFrameData = res.screenshotData;
          return res.screenshotData;
        }
        return this.lastFrameData!;
      }

      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
=======
    if (this.targetElementHandle) {
      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
>>>>>>> REPLACE
```

**Why**: Simplifies the hot loop and removes a flaky `clip` operation in `beginFrame`, standardizing element targeting on Playwright's native `screenshot` method.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` from the `packages/renderer` directory.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` from the `packages/renderer` directory.
Run the DOM render benchmark script multiple times to verify median render time improvement.

## Prior Art
- PERF-356 (Simplified DOM finding by removing custom scripts)
