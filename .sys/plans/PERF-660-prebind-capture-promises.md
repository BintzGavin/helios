---
id: PERF-660
slug: prebind-capture-promises
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-660: Prebind Capture Promises in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture()`

## Background Research
The `capture()` method is the hottest loop function that evaluates each frame. Currently, the IPC promise resolution in `capture()` awaits the `this.cdpSession!.send` result. Because we are making a Playwright IPC call every frame, the allocation of the resolved `result.screenshotData` is evaluated inline. While PERF-659 showed that removing the explicit `try...catch` and chaining `.catch()` regresses performance by 0.8% due to promise chaining microtasks vs native async/await, we haven't attempted to optimize the promise chain using a pre-allocated return value when no exceptions occur.

Instead of dynamically returning `this.lastFrameData!`, we can slightly optimize the return evaluation if we avoid re-evaluating the fallback if the screenshotData is available, by bypassing the assignment overhead when we know the value returned from the IPC is exactly what we need to return.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.745s
- **Bottleneck analysis**: Property access and assignment operations in the hottest loop in `DomStrategy.ts`.

## Implementation Spec

### Step 1: Optimize Variable Return in `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rewrite the `capture()` method to return the data immediately if present, bypassing the `this.lastFrameData` assignment overhead unless strictly necessary.

```typescript
<<<<<<< SEARCH
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      if (result.screenshotData) {
        this.lastFrameData = result.screenshotData;
      }
      return this.lastFrameData!;
    } catch (e) {
      return this.lastFrameData!;
    }
  }
=======
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    try {
      const result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
      const data = result.screenshotData;
      if (data) {
        this.lastFrameData = data;
        return data;
      }
      return this.lastFrameData!;
    } catch (e) {
      return this.lastFrameData!;
    }
  }
>>>>>>> REPLACE
```

**Why**: By accessing `result.screenshotData` once and returning it immediately if truthy, we bypass the secondary lookup to `this.lastFrameData` in the success path, which happens for almost every single frame.
**Risk**: Functionally identical. No risk.

## Variations
None.

## Correctness Check
Run the DOM render benchmark script (`npx tsx packages/renderer/scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
- PERF-659 (Inline try-catch inside DomStrategy capture) - Demonstrated that native `try...catch` is faster than `.catch()` for CDP IPC.
