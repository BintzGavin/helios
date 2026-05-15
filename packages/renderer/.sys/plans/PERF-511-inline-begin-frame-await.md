---
id: PERF-511
slug: inline-begin-frame-await
status: unclaimed
claimed_by: ""
created: 2024-05-15
completed: ""
result: ""
---

# PERF-511: Inline Begin Frame Await

## Focus Area
`DomStrategy.ts` `capture()` method.

## Background Research
The `capture()` method currently returns the CDP send promise and chains `.then(this.handleBeginFrameSuccess, this.handleBeginFrameError)`. This delegates the resolution logic to separate functions but requires V8 to allocate additional closures and Promise objects. By inlining the await and exception handling directly inside the `capture()` function via `try/catch`, we eliminate these overheads in the hottest part of the DOM capture loop.

## Benchmark Configuration
- **Composition URL**: standard dom benchmark composition
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.687s
- **Bottleneck analysis**: Microtask queue churn and Promise object allocations within V8 for every single captured frame.

## Implementation Spec

### Step 1: Inline Await and Try/Catch
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Remove `handleBeginFrameSuccess` and `handleBeginFrameError` methods. Update `capture()` to use `try/catch` and `await` instead of `.then()`.

```diff
<<<<<<< SEARCH
  private handleBeginFrameSuccess = (result: any) => {
    const frameData = result.screenshotData || this.lastFrameData!;
    this.lastFrameData = frameData;
    return frameData;
  };

  private handleBeginFrameError = () => {
    return this.lastFrameData!;
  };

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
      this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

      return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
        .then(this.handleBeginFrameSuccess, this.handleBeginFrameError);
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(this.handleBeginFrameSuccess, this.handleBeginFrameError);
  }
=======
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
>>>>>>> REPLACE
```
**Why**: Avoids creating secondary Promise objects via `.then()` and anonymous closures per frame, directly executing logic synchronously after the awaited CDP call.
**Risk**: Negligible. Error behavior remains strictly identical.
