---
id: PERF-544
slug: remove-try-catch-dom-strategy
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-544: Eliminate try-catch blocks from hot loop in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture()` method

## Background Research
In the hot capture loop (`DomStrategy.capture()`), a `try...catch` block is currently used around the `this.cdpSession!.send('HeadlessExperimental.beginFrame', ...)` call. `try...catch` blocks within high-frequency loops (the hot loop) introduce measurable V8 microtask scheduling and execution scope overhead on every frame. By removing the `try...catch` and returning `lastFrameData` inside a native promise `.catch()` handler, we bypass setting up a block scope to capture exceptions on every loop iteration, which can allow for better JIT compilation and save micro-overhead per frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.046s
- **Bottleneck analysis**: Microtask scope setup inside the hot path.

## Implementation Spec

### Step 1: Remove `try...catch` and chain `.catch()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rewrite the `capture()` method so that the await uses a native promise chain with `.catch()`.

```typescript
<<<<<<< SEARCH
    if (this.targetElementHandle) {
      const box = await this.targetElementHandle.boundingBox();
      if (!box) {
         return this.lastFrameData!;
      }

      this.targetBeginFrameParams.screenshot.clip.x = box.x;
      this.targetBeginFrameParams.screenshot.clip.y = box.y;
      this.targetBeginFrameParams.screenshot.clip.width = box.width;
      this.targetBeginFrameParams.screenshot.clip.height = box.height;
      this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

      try {
        const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        const frameData = result.screenshotData || this.lastFrameData!;
        this.lastFrameData = frameData;
        return frameData;
      } catch (e) {
        return this.lastFrameData!;
      }
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      const frameData = result.screenshotData || this.lastFrameData!;
      this.lastFrameData = frameData;
      return frameData;
    } catch (e) {
      return this.lastFrameData!;
    }
  }

  async finish(page: Page): Promise<void> {
=======
    if (this.targetElementHandle) {
      const box = await this.targetElementHandle.boundingBox();
      if (!box) {
         return this.lastFrameData!;
      }

      this.targetBeginFrameParams.screenshot.clip.x = box.x;
      this.targetBeginFrameParams.screenshot.clip.y = box.y;
      this.targetBeginFrameParams.screenshot.clip.width = box.width;
      this.targetBeginFrameParams.screenshot.clip.height = box.height;
      this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams).catch(() => ({ screenshotData: null }));
      const frameData = result.screenshotData || this.lastFrameData!;
      this.lastFrameData = frameData;
      return frameData;
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

    const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams).catch(() => ({ screenshotData: null }));
    const frameData = result.screenshotData || this.lastFrameData!;
    this.lastFrameData = frameData;
    return frameData;
  }

  async finish(page: Page): Promise<void> {
>>>>>>> REPLACE
```
**Why**: Avoids setting up `try...catch` scope every frame, allowing native promise resolution and better optimization.
**Risk**: Functionally identical, so risk is minimal.

## Variations
None.

## Canvas Smoke Test
None.

## Correctness Check
Run the DOM render benchmark script (`npx tsx packages/renderer/tests/fixtures/benchmark.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
None.
