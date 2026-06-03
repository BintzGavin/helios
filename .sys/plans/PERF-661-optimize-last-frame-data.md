---
id: PERF-661
slug: optimize-last-frame-data
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-661: Optimize Last Frame Data Fallback Assignment in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture()`

## Background Research
The `capture()` method is the hottest loop function in the `DomStrategy` evaluating each frame. The current implementation relies on a `try...catch` block around the CDP IPC call (`this.cdpSession!.send`) and assigns `this.lastFrameData` conditionally.

```typescript
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
```

Prior experiments have taught us several lessons about optimizing this block:
1. **PERF-659 / PERF-623 / PERF-544 / PERF-626**: Replacing `try...catch` with `.catch()`, or replacing `async...await` with direct `.then()` chains consistently regressed performance. V8's native `async`/`await` and `try...catch` blocks are heavily optimized for the promise resolution sequence in this hot path.
2. **PERF-581**: Prebinding the handlers inside `.then` chains regressed performance because the indirect execution context was slower than V8's optimized inline closure allocation.
3. **PERF-630**: Bypassing the conditional assignment entirely and relying on short-circuit evaluation (`return result.screenshotData || this.lastFrameData!`) was attempted but did not yield performance gains (and was discarded).

However, a slight variation in the current approach (PERF-660 logic) remains untested and potentially beneficial. Instead of making the property assignment conditional on `result.screenshotData`, and subsequently falling back to a property read (`return this.lastFrameData!`), we can cache the `result.screenshotData` to a local variable. If truthy, we perform the assignment and return the *local* variable immediately. This avoids a secondary object property lookup (`this.lastFrameData!`) in the success path, which is the path taken on virtually every frame.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: Standard benchmark constraints.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.565s
- **Bottleneck analysis**: Secondary object property access overhead inside the V8 hot loop.

## Implementation Spec

### Step 1: Optimize variable return in `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rewrite the success block of the `capture()` method to pull `result.screenshotData` into a local variable. If it's truthy, assign it to `this.lastFrameData` and immediately return the local variable, bypassing the final fallback return statement.

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

**Why**: By checking and returning the local `data` variable, we avoid resolving the `this` context to look up `this.lastFrameData!` when we already have the string in memory. While V8 is fast at property lookups, eliminating redundant lookups inside tight loops can shave off micro-milliseconds per frame.

## Correctness Check
Run the `packages/renderer/scripts/benchmark-perf.ts` script to test performance and verify correct output. Ensure the video renders successfully without stalling.

## Canvas Smoke Test
Run `npm run test:renderer` to ensure `CanvasStrategy` is unaffected.

## Prior Art
- PERF-660: Conceptually identical plan that went unclaimed/unimplemented.
- PERF-630: Attempted bypassing state tracking but discarded. This variation keeps state tracking but optimizes the return.
- PERF-659: Re-affirmed that native `try...catch` is optimal for this block.
