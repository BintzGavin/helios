---
id: PERF-415
slug: inline-dom-strategy-object-allocation
status: complete
claimed_by: "EX"
created: 2024-05-02
completed: "2026-05-03"
result: "failed"
---

# PERF-415: Preallocate CDP Screenshots Parameters and Object Literals in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture()` method hot loop.

## Background Research
During rendering via the DOM strategy, the `capture()` method invokes `Page.screenshot` or `HeadlessExperimental.beginFrame` depending on whether a `targetElementHandle` is configured or not.

When `targetElementHandle` is present, `this.targetElementHandle.screenshot` is called with a dynamically allocated object:
```javascript
      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
      const res = await this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      });
```
This forces V8 to allocate a short-lived object literal on the heap on every single frame, resulting in garbage collector pressure over the course of thousands of frames.

We can preallocate this `screenshot` options object, mutating its `omitBackground` flag (if needed, though it is usually static based on the format), or pre-calculating it completely in `prepare` / the constructor.

Similarly, inside `DomStrategy.ts` we have:
```javascript
      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
```
This string comparison happens per frame, which can be evaluated once.

By caching the `screenshotOptions` object locally in `DomStrategy`, we can skip the allocation overhead entirely.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-allocations of `{ type: ..., quality: ..., omitBackground: ... }` inside the hot loop.

## Implementation Spec

### Step 1: Preallocate `elementScreenshotParams`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Declare a new class property:
```javascript
  private elementScreenshotParams: any = null;
```

In `prepare(page: Page)`, after setting `this.cdpScreenshotParams`, initialize `this.elementScreenshotParams`:
```javascript
<<<<<<< SEARCH
    this.frameInterval = 1000 / this.options.fps;
    this.beginFrameParams.interval = this.frameInterval;
    this.cdpScreenshotParams = cdpScreenshotParams;
    this.beginFrameParams.screenshot = cdpScreenshotParams;
=======
    this.frameInterval = 1000 / this.options.fps;
    this.beginFrameParams.interval = this.frameInterval;
    this.cdpScreenshotParams = cdpScreenshotParams;
    this.beginFrameParams.screenshot = cdpScreenshotParams;

    this.elementScreenshotParams = {
      type: cdpScreenshotParams.format,
      quality: cdpScreenshotParams.quality,
      omitBackground: cdpScreenshotParams.format !== 'jpeg'
    };
>>>>>>> REPLACE
```

### Step 2: Use `elementScreenshotParams` in `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify `capture` to use the preallocated object:
```javascript
<<<<<<< SEARCH
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
      const res = await this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      });
      if (res) {
        this.lastFrameData = res;
        return res;
      }
      return this.lastFrameData!;
    }
=======
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      const res = await this.targetElementHandle.screenshot(this.elementScreenshotParams);
      if (res) {
        this.lastFrameData = res;
        return res;
      }
      return this.lastFrameData!;
    }
>>>>>>> REPLACE
```

**Why**: Removes per-frame string comparisons and dynamic object allocation, relieving GC pressure.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npm run test` to verify no breakages.

## Result
IMPOSSIBLE: DUPLICATION. The structural change (preallocating `elementScreenshotParams`) was already implemented and kept by a previous experiment (PERF-414). Documented duplication and stopped work.
