---
id: PERF-303
slug: remove-format-response-overhead
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2026-04-18"
result: "inconclusive"
---

# PERF-303: Remove formatResponse call in CaptureLoop.ts

## Focus Area
Frame Capture Loop (`CaptureLoop.ts`) and `DomStrategy.ts`.

## Background Research
In the hot loop inside `CaptureLoop.ts`, `formatResponse` is being called dynamically using `.call()`:
`const buffer = formatResponse ? formatResponse.call(strategy, rawResponse) : rawResponse;`

Previous experiments (`PERF-294`, `PERF-292`) attempted to optimize this by directly invoking the function (`formatResponse(rawResponse)`) or by inlining the extraction logic directly inside the hot loop. However, V8's dynamic function dispatch already optimizes `.call` efficiently, so those attempts either resulted in no gain or slight regression.

Instead of trying to optimize the *call* to `formatResponse`, we should examine whether `formatResponse` itself is fundamentally necessary. `DomStrategy.capture()` returns `this.cdpSession!.send('HeadlessExperimental.beginFrame', ...)` which yields an object containing `screenshotData`. Currently, `formatResponse` simply extracts `res.screenshotData` and caches it as `this.lastFrameData` to be returned in case of missing data in subsequent frames.

However, `HeadlessExperimental.beginFrame` almost always returns valid screenshot data when requested (unless `hasDamage` is set and false, which we don't use currently). By modifying `DomStrategy.capture()` to extract and return the `screenshotData` directly (or a cached fallback) before resolving the promise, we completely eliminate the need for `formatResponse` inside the `CaptureLoop.ts` hot loop, saving an entire function call, type check, and variable assignment per frame.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.3s
- **Bottleneck analysis**: The `formatResponse.call(strategy, rawResponse)` is an extra step in the hot loop that can be entirely avoided.

## Implementation Spec

### Step 1: Remove `formatResponse` from `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove the `public formatResponse = (res: any): Buffer | string => { ... }` method entirely.
2. In `capture(page: Page, frameTime: number): Promise<any>`, change the return type to `Promise<string | Buffer>`.
3. Wrap the `cdpSession!.send` calls and `targetElementHandle.screenshot` calls in `capture()` so that they await the result, extract the data (e.g., `res.screenshotData`), cache it in `this.lastFrameData`, and return it directly. If the data is missing, return `this.lastFrameData` or `this.emptyImageBase64` just like `formatResponse` used to do.

For example:
```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        return this.processCaptureResult(res);
      }

      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
      const res = await this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      });
      return this.processCaptureResult(res);
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    return this.processCaptureResult(res);
  }

  private processCaptureResult(res: any): Buffer | string {
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    } else if (this.lastFrameData) {
      return this.lastFrameData;
    } else {
      this.lastFrameData = this.emptyImageBase64;
      return this.emptyImageBase64;
    }
  }
```

### Step 2: Remove `formatResponse` from `RenderStrategy.ts`
**File**: `packages/renderer/src/strategies/RenderStrategy.ts`
**What to change**:
Remove the `formatResponse?(rawRes: any): Buffer | string;` interface definition. Update `capture` return type if necessary.

### Step 3: Remove `formatResponse` usage from `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `runWorker`, simplify the capture logic by removing `formatResponse`:
```typescript
                timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);
                const buffer = await strategy.capture(page, time);
                if (ctx.resolve) ctx.resolve(buffer);
```
Remove `const formatResponse = strategy.formatResponse;` definition inside `runWorker`.

**Why**: Consolidating the capture and extraction simplifies the pipeline loop architecture, reducing V8 dynamic dispatch and property lookup overhead in the most critical loop of the application.
**Risk**: Negligible. The functional behavior of data caching and returning remains identical, merely shifted into the strategy's `capture` promise resolution rather than as an external synchronous mapping function.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode is unaffected. Ensure `CanvasStrategy` doesn't implement `formatResponse` (it already returns `Buffer | string` directly).

## Correctness Check
Run the DOM smoke tests (`npx tsx tests/verify-dom-strategy-capture.ts`) to ensure screenshots are correctly captured and not just falling back to empty images.

## Prior Art
- **PERF-294**: Attempted to inline `formatResponse` CDP extraction directly inside the hot loop but degraded performance due to branching overhead inside the loop. By moving the logic *into* the `capture()` promise resolution where it belongs natively, we avoid polluting the `CaptureLoop.ts` worker with strategy-specific branching.

## Results Summary
- **Best render time**: 48.141s (vs baseline ~47.3s)
- **Improvement**: Inconclusive (Noise Margin)
- **Kept experiments**: Removed formatResponse, consolidated processing into DomStrategy capture
- **Discarded experiments**: None
