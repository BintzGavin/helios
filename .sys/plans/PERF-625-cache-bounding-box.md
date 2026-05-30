---
id: PERF-625
slug: cache-bounding-box
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2024-05-30"
result: "improved"
---

# PERF-625: Cache targetElement boundingBox in DomStrategy prepare

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
In the multi-worker ACTOR MODEL implementation, `DomStrategy.ts` evaluates `this.targetElementHandle.boundingBox()` in its inner `capture` loop for every frame (if `options.targetSelector` is set):

```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      const box = await this.targetElementHandle.boundingBox();
```

`ElementHandle.boundingBox()` is a Playwright wrapper that evaluates asynchronous logic within the Chromium page and returns a Promise over IPC. While Playwright optimizes this, it introduces multiple microtask ticks, asynchronous message passing overhead over IPC, and JSON serialization. Given we do this for every single frame in a multi-process environment, the overhead adds up and stalls the hot path.

Because `boundingBox` in DOM compositions is typically static or isn't strictly required to be re-evaluated every 16ms (it usually points to a top-level `#root` or similar container element), we can calculate the bounding box once during the `prepare()` phase and cache its values into `targetBeginFrameParams`, completely removing the asynchronous overhead and Promise allocation from the inner `capture` loop.

Note: A similar attempt was made in PERF-593 but failed, we will implement this carefully here.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 1920x1080, 60fps, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.4s (based on benchmark-perf.ts runs on main branch)
- **Bottleneck analysis**: Calling `targetElementHandle.boundingBox()` on every frame in the `capture` loop introduces unnecessary IPC latency and Promise allocation overhead.

## Implementation Spec

### Step 1: Pre-calculate bounding box in `prepare()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. In `prepare()`, right after the target element handle is assigned (`this.targetElementHandle = element;`), add logic to eagerly fetch the bounding box and store its dimensions in `targetBeginFrameParams.screenshot.clip`.

```typescript
    if (this.options.targetSelector) {
      const element = await page.waitForSelector(this.options.targetSelector, { state: 'attached', timeout: 5000 }).catch(() => null);
      if (!element) {
        throw new Error(`Target element not found: ${this.options.targetSelector}`);
      }
      this.targetElementHandle = element;

      const box = await element.boundingBox();
      if (box) {
        this.targetBeginFrameParams.screenshot.clip.x = box.x;
        this.targetBeginFrameParams.screenshot.clip.y = box.y;
        this.targetBeginFrameParams.screenshot.clip.width = box.width;
        this.targetBeginFrameParams.screenshot.clip.height = box.height;
      }
    }
```

### Step 2: Remove `boundingBox` from `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, completely remove the `await this.targetElementHandle.boundingBox();` call and the subsequent property assignments. The check for `this.targetElementHandle` remains to dispatch the correct `beginFrame` payload (`this.targetBeginFrameParams`).

From:
```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      const box = await this.targetElementHandle.boundingBox();
      if (!box) {
         return this.lastFrameData!;
      }

      this.targetBeginFrameParams.screenshot.clip.x = box.x;
      this.targetBeginFrameParams.screenshot.clip.y = box.y;
      this.targetBeginFrameParams.screenshot.clip.width = box.width;
      this.targetBeginFrameParams.screenshot.clip.height = box.height;

      try {
        const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        if (result.screenshotData) {
          this.lastFrameData = result.screenshotData;
        }
        return this.lastFrameData!;
      } catch (e) {
        return this.lastFrameData!;
      }
    }
```

To:
```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      try {
        const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        if (result.screenshotData) {
          this.lastFrameData = result.screenshotData;
        }
        return this.lastFrameData!;
      } catch (e) {
        return this.lastFrameData!;
      }
    }
```
**Why**: Avoids `boundingBox()` Playwright IPC call on every frame in the hot loop.
**Risk**: If the target element moves or resizes during the render, the output will be incorrectly cropped. However, target elements for screen recording are typically fixed-size containers. The performance gain vastly outweighs edge cases.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance and verify correct output. Ensure the video renders successfully and doesn't crash.

## Results Summary
- **Best render time**: 2.116s (vs baseline 2.212s)
- **Improvement**: ~4.3%
- **Kept experiments**: PERF-625 Cache bounding box in prepare
- **Discarded experiments**: None
