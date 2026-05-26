---
id: PERF-593
slug: cache-bounding-box
status: complete
claimed_by: "executor-session"
created: 2026-05-26
completed: "2026-05-26"
result: "failed"
---

# PERF-593: Cache targetElement boundingBox in DomStrategy prepare

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
In the multi-worker ACTOR MODEL implementation, `DomStrategy.ts` evaluates `this.targetElementHandle.boundingBox()` in its inner `capture` loop for every frame (if `options.targetSelector` is set):

```typescript
  capture(page: Page, frameTime: number): Promise<Buffer | string> | Buffer | string {
    if (this.targetElementHandle) {
      return this.targetElementHandle.boundingBox().then((box: any) => {
        // ... updates clip ...
        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
```

`ElementHandle.boundingBox()` is a Playwright wrapper that evaluates asynchronous logic within the Chromium page and returns a Promise over IPC. While Playwright optimizes this, it introduces multiple microtask ticks, asynchronous message passing overhead over IPC, and JSON serialization. Given we do this for every single frame in a multi-process environment, the overhead adds up and stalls the hot path.

Because `boundingBox` in DOM compositions is typically static or isn't strictly required to be re-evaluated every 16ms (it usually points to a top-level `#root` or similar container element), we can calculate the bounding box once during the `prepare()` phase and cache its values into `targetBeginFrameParams`, completely removing the asynchronous overhead and Promise allocation from the inner `capture` loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 1920x1080, 60fps, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.374s (Last benchmark from PERF-592)
- **Bottleneck analysis**: Calling `targetElementHandle.boundingBox()` on every frame in the `capture` loop introduces unnecessary IPC latency and Promise allocation overhead.

## Implementation Spec

### Step 1: Pre-calculate bounding box in `prepare()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. In `prepare()`, after the target element handle is assigned (`this.targetElementHandle = element;`), add:
```typescript
      const box = await element.boundingBox();
      if (box) {
        this.targetBeginFrameParams.screenshot.clip.x = box.x;
        this.targetBeginFrameParams.screenshot.clip.y = box.y;
        this.targetBeginFrameParams.screenshot.clip.width = box.width;
        this.targetBeginFrameParams.screenshot.clip.height = box.height;
      }
```

### Step 2: Remove `boundingBox` from `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, remove the wrapper `this.targetElementHandle.boundingBox().then((box: any) => { ... })`. Replace:
```typescript
    if (this.targetElementHandle) {
      return this.targetElementHandle.boundingBox().then((box: any) => {
        if (!box) {
           return this.lastFrameData!;
        }

        this.targetBeginFrameParams.screenshot.clip.x = box.x;
        this.targetBeginFrameParams.screenshot.clip.y = box.y;
        this.targetBeginFrameParams.screenshot.clip.width = box.width;
        this.targetBeginFrameParams.screenshot.clip.height = box.height;

        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
          .then(result => {
            if (result.screenshotData) {
              this.lastFrameData = result.screenshotData;
            }
            return this.lastFrameData!;
          })
          .catch(e => {
            return this.lastFrameData!;
          });
      });
    }
```
with just:
```typescript
    if (this.targetElementHandle) {
        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
          .then(result => {
            if (result.screenshotData) {
              this.lastFrameData = result.screenshotData;
            }
            return this.lastFrameData!;
          })
          .catch(e => {
            return this.lastFrameData!;
          });
    }
```
**Why**: Avoids `boundingBox()` Playwright IPC call and its `.then()` chain on every frame in the hot loop.
**Risk**: If the target element moves or resizes during the render, the output will be incorrectly cropped. However, target elements for screen recording are typically fixed-size containers. The performance gain vastly outweighs edge cases.

## Results Summary
- **Best render time**: 6.714s (vs baseline 6.684s)
- **Kept experiments**: None
- **Discarded experiments**: PERF-593
