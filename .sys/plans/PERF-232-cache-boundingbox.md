---
id: PERF-232
slug: cache-boundingbox
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---
# PERF-232: Cache target element bounding box in DomStrategy

## Focus Area
The `DomStrategy.capture()` hot loop when `targetSelector` is provided. We want to eliminate the asynchronous `.boundingBox()` call per frame, and instead calculate it once during `prepare()` and cache the resulting clip params.

## Background Research
Currently, if `this.targetElementHandle` is set, `DomStrategy.capture()` calls `this.targetElementHandle.boundingBox()` on every single frame. This triggers an asynchronous Playwright IPC round trip (`page.evaluate` or CDP `DOM.getBoxModel` under the hood) just to fetch the element coordinates, before it can even call `HeadlessExperimental.beginFrame`.

Since DOM rendering assumes fixed composition dimensions and the target element is typically statically positioned (or scales with the viewport), the bounding box coordinates should not change between frames. By fetching `boundingBox()` once during `prepare()` and setting the `this.targetBeginFrameParams.screenshot.clip` values, we can bypass this expensive per-frame IPC call entirely.

## Benchmark Configuration
- **Composition URL**: Any test using `targetSelector` (e.g. via `npx tsx packages/renderer/tests/verify-dom-selector.ts`)
- **Render Settings**: 1920x1080, 60 FPS, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: `this.targetElementHandle.boundingBox()` adds significant latency in the hot loop when `targetSelector` is specified, waiting on IPC before `beginFrame` can be called.

## Implementation Spec

### Step 1: Cache bounding box in `prepare()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, right after resolving `this.targetElementHandle` (around line 188), calculate and cache the bounding box into `this.targetBeginFrameParams.screenshot.clip`. If the bounding box is null, do nothing or throw an error.

```typescript
      this.targetElementHandle = element;
      const box = await this.targetElementHandle.boundingBox();
      if (box) {
        this.targetBeginFrameParams.screenshot.clip.x = box.x;
        this.targetBeginFrameParams.screenshot.clip.y = box.y;
        this.targetBeginFrameParams.screenshot.clip.width = box.width;
        this.targetBeginFrameParams.screenshot.clip.height = box.height;
      } else {
        console.warn(`Could not determine bounding box for target element: ${this.options.targetSelector}`);
      }
```

**Why**: Avoid fetching it per frame.
**Risk**: If the target element *does* change size or position during animation, this will crop it incorrectly.

### Step 2: Bypass boundingBox() in `capture()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, remove the `const box = await this.targetElementHandle.boundingBox();` call and the associated `if (box)` wrapper. Directly use the pre-populated `this.targetBeginFrameParams`.
Change it to simply check if `this.targetBeginFrameParams.screenshot.clip.width > 0`. If it is, use CDP `beginFrame`. If not, use the fallback `screenshot()`.

```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        if (res && res.screenshotData) {
          this.lastFrameData = res.screenshotData;
          return res.screenshotData;
        } else if (this.lastFrameData) {
          return this.lastFrameData;
        } else {
          this.lastFrameData = this.emptyImageBase64;
          return this.emptyImageBase64;
        }
      }
      const fallback = await this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions);
      this.lastFrameData = fallback as Buffer;
      return fallback as Buffer;
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
// ... (rest remains the same)
```

**Why**: By using the pre-computed bounds and parameters, the `capture` method for `targetSelector` becomes as fast as the full-page capture method.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas isn't broken.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-selector.ts` and verify output.
