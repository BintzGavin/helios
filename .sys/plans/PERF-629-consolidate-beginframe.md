---
id: PERF-629
slug: consolidate-beginframe
status: unclaimed
claimed_by: ""
created: 2024-05-31
completed: ""
result: ""
---

# PERF-629: Consolidate HeadlessExperimental.beginFrame CDP Call in DomStrategy

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
Currently, the `DomStrategy.capture()` hot loop contains an `if (this.targetElementHandle)` condition that determines which parameter object (`this.targetBeginFrameParams` vs `this.beginFrameParams`) to pass to `this.cdpSession!.send('HeadlessExperimental.beginFrame', ...)`. This creates branching logic and code duplication in the absolute hottest path.

In PERF-627, consolidating this branching by adding a generic `activeBeginFrameParams` object caused a regression, likely because V8 deoptimized the call due to the polymorphic nature of the generic object or the indirection introduced.

A simpler, more engine-friendly approach is to pre-assign `this.beginFrameParams` with the target values during `prepare()` if a target selector is used. This allows us to unify the `try/catch` and `beginFrame` call without introducing a new class property, completely eliminating the branch in the `capture` loop and reusing the existing, heavily optimized `this.beginFrameParams` shape.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/output/example-build/composition.html`)
- **Render Settings**: Standard microVM constraints
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.116s (based on PERF-625 data)
- **Bottleneck analysis**: The `capture` loop is the hottest path. Removing branches and duplicate IPC calls reduces bytecode size and improves V8 inlining.

## Implementation Spec

### Step 1: Unify parameters in `prepare()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, remove `this.targetBeginFrameParams`.
Instead, if `this.targetElementHandle` and `box` exist, mutate `this.beginFrameParams` to include the `clip` object:

```typescript
      const box = await element.boundingBox();
      if (box) {
        this.beginFrameParams.screenshot.clip = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          scale: 1
        };
      }
```

### Step 2: Remove the branch in `capture()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rewrite the `capture()` method to consist of a single `try/catch` block, removing the `if (this.targetElementHandle)` branch entirely.

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

**Why**: By unifying the parameters during setup, we eliminate the conditional branch and duplicate CDP send logic in the hot loop. V8 can inline the `capture()` function more aggressively due to reduced bytecode size.
**Risk**: Very low. The behavior is functionally identical.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance and verify correct output. Ensure the video renders successfully and doesn't crash.

## Prior Art
- PERF-627 (discarded due to `activeBeginFrameParams` indirection regression)
- PERF-625 (moved bounding box calc to prepare phase)
