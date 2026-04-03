---
id: PERF-164
slug: cache-boundingbox
status: complete
claimed_by: "executor-session"
created: 2024-04-03
completed: 2024-04-03
result: discarded
---
# PERF-164: Cache targetElementHandle boundingBox to avoid per-frame IPC

## Focus Area
The `DomStrategy.capture()` hot loop when `targetSelector` is provided. We want to eliminate the asynchronous `.boundingBox()` call per frame, and instead calculate it once during `prepare()` and cache the resulting clip params.

## Background Research
Currently, if `this.targetElementHandle` is set, `DomStrategy.capture()` calls `this.targetElementHandle.boundingBox()` on every single frame. This triggers an asynchronous Playwright IPC round trip (`page.evaluate` or CDP `DOM.getBoxModel` under the hood) just to fetch the element coordinates, before it can even call `HeadlessExperimental.beginFrame`.

Since DOM rendering assumes fixed composition dimensions and the target element is typically statically positioned (or scales with the viewport), the bounding box coordinates should not change between frames. By fetching `boundingBox()` once during `prepare()` and setting the `this.beginFrameTargetParams.screenshot.clip` values, we can bypass this expensive per-frame IPC call entirely.

## Benchmark Configuration
- **Composition URL**: Any test using `targetSelector` (e.g. via `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` modified to use a selector, or testing via `capture()` directly)
- **Render Settings**: 1920x1080, 60 FPS, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: `this.targetElementHandle.boundingBox()` adds significant latency in the hot loop when `targetSelector` is specified, waiting on IPC before `beginFrame` can be called.

## Implementation Spec

### Step 1: Cache bounding box in `prepare()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, right after resolving `this.targetElementHandle` (around line 175):
```typescript
      this.targetElementHandle = element;
      const box = await this.targetElementHandle.boundingBox();
      if (box) {
        this.beginFrameTargetParams.screenshot.clip.x = box.x;
        this.beginFrameTargetParams.screenshot.clip.y = box.y;
        this.beginFrameTargetParams.screenshot.clip.width = box.width;
        this.beginFrameTargetParams.screenshot.clip.height = box.height;
      }
```
**Why**: Avoid fetching it per frame.
**Risk**: If the target element *does* change size or position during animation, this will crop it incorrectly.

### Step 2: Bypass boundingBox() in `capture()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, remove the `this.targetElementHandle.boundingBox().then((box: any) => { ... })` wrapper.
Instead, directly use the pre-populated `this.beginFrameTargetParams`. If `this.beginFrameTargetParams.screenshot.clip.width` is 0 (meaning no box was found), fallback to `this.targetElementHandle.screenshot`.

```typescript
  capture(page: Page, frameTime: number): Promise<Buffer> {
    if (this.targetElementHandle) {
      if (this.cdpSession && this.beginFrameTargetParams.screenshot.clip.width > 0) {
        this.beginFrameTargetParams.frameTimeTicks = 10000 + frameTime;

        return this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameTargetParams).then(({ screenshotData }: any) => {
          if (screenshotData) {
            const buffer = this.writeToBufferPool(screenshotData);
            this.lastFrameBuffer = buffer;
            return buffer;
          } else if (this.lastFrameBuffer) {
            return this.lastFrameBuffer;
          } else {
            // Wait for next explicit tick or fallback if damage driven logic fails
            // When beginFrame is active, Page.captureScreenshot hangs.
            // But if we're here, it means the frame was omitted. Let's just create an empty buffer
            // to avoid hanging
            this.lastFrameBuffer = this.emptyImageBuffer;
            return this.emptyImageBuffer;
          }
        });
      }

      return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
        this.lastFrameBuffer = fallback;
        return fallback as Buffer;
      });
    }
```

**Why**: By using the pre-computed bounds and parameters, the `capture` method for `targetSelector` becomes as fast as the full-page capture method.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas isn't broken.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` and verify output.

## Results Summary
- **Best render time**: 33.912s (baseline)
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: Cache targetElementHandle boundingBox in DomStrategy.prepare (PERF-164)
