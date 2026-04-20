---
id: PERF-322
slug: eliminate-dead-branches
status: complete
claimed_by: ""
created: 2024-05-28
completed: "2024-05-28"
result: "Performance improved. Render time: 32.089s (Baseline: 45.321s). Code merged."
---

# PERF-322: Eliminate Dead Branch Evaluation in DomStrategy.capture()

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `DomStrategy.ts`.

## Background Research
In `DomStrategy.capture()`, the primary fallback logic handles unchanged frames when Chromium skips PNG encoding:

```typescript
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    }
    return this.lastFrameData!;
```

When a frame has no visual changes (which occurs frequently in 60fps renders or static scenes), Chromium returns `{ hasDamage: false }` without `screenshotData`. This causes `res.screenshotData` to be undefined. The execution then evaluates `else if (Buffer.isBuffer(res))`.

Because `HeadlessExperimental.beginFrame` strictly returns a CDP JSON object and *never* a Node.js `Buffer`, `Buffer.isBuffer(res)` will always be false. This means on every single unchanged frame, the renderer wastes CPU cycles calling a Node.js native function `Buffer.isBuffer()` just to evaluate a dead branch.

We can completely eliminate these checks across all branches of `capture()` since the Playwright `.screenshot()` method conversely *always* returns a `Buffer` and never an object with `screenshotData`.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html`
- **Render Settings**: Baseline identical settings across all runs, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 45.321s
- **Bottleneck analysis**: The cost of executing `Buffer.isBuffer()` function calls continuously during unchanged frames in the hot loop.

## Implementation Spec

### Step 1: Remove dead branches in `capture()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, remove the `Buffer.isBuffer()` checks on the CDP paths, and remove the `res.screenshotData` check on the Playwright target selector path.

Replace the entire `capture` method with:

```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        if (res && res.screenshotData) {
          this.lastFrameData = res.screenshotData;
          return res.screenshotData;
        }
        return this.lastFrameData!;
      }

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

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    }
    return this.lastFrameData!;
  }
```

**Why**: By removing `Buffer.isBuffer(res)` from the CDP paths, we eliminate a function call on every single undamaged frame. By removing `res && res.screenshotData` from the Playwright target element path, we eliminate property lookups on every frame since `.screenshot()` returns a Buffer.
**Risk**: Minimal. The types and values returned by `CDPSession` and `targetElementHandle.screenshot` are strictly defined and mutually exclusive in this context.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas isn't affected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure the DOM strategy logic runs and correctly falls back to the mocked `lastFrameData` buffer.
