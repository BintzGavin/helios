---
id: PERF-310
slug: polymorphic-capture
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-310: Polymorphic Capture Method in DomStrategy

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `DomStrategy.ts`

## Background Research
Currently, the `capture` method in `DomStrategy.ts` evaluates `if (this.targetElementHandle)` on *every single frame*. Since the vast majority of our targets do not use `targetSelector`, checking this conditionally inside the hot loop adds unnecessary branch prediction overhead for V8. By evaluating the presence of `targetElementHandle` once during `prepare()` and assigning a specialized method directly to `this.capture`, we can eliminate this branch from the hot loop entirely.
A previous experiment (PERF-201) attempted this by extracting the logic into `captureTargetElement` and `captureFullPage` methods and assigning `this.capture` dynamically. Although it was discarded then because of potential bind overhead or because it showed a regression, using arrow functions instead of `bind` can avoid the `bind` overhead and correctly preserve lexical scope natively without performance penalties.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.5s
- **Bottleneck analysis**: Micro-stalls from branch prediction on `this.targetElementHandle` in the frame capture hot loop (`DomStrategy.capture`).

## Implementation Spec

### Step 1: Extract specialized capture functions using Arrow Functions
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Inside `DomStrategy`, convert `capture` from a standard method into a property typed as a function, and define two private arrow functions that implement the specific logic:

```typescript
  capture!: (page: Page, frameTime: number) => Promise<Buffer | string>;

  private captureTargetElement = async (page: Page, frameTime: number): Promise<Buffer | string> => {
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
  };

  private captureFullPage = async (page: Page, frameTime: number): Promise<Buffer | string> => {
    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    return this.processCaptureResult(res);
  };
```

**Why**: Arrow functions preserve `this` without the overhead of `.bind()`, and separating the logic prevents V8 from evaluating the `if (this.targetElementHandle)` condition on every frame.
**Risk**: Negligible.

### Step 2: Assign capture method dynamically in prepare
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
At the very end of the `prepare()` method, assign the appropriate function to `this.capture`:

```typescript
    if (this.options.targetSelector && this.targetElementHandle) {
      this.capture = this.captureTargetElement;
    } else {
      this.capture = this.captureFullPage;
    }
```
Remove the original `async capture(page: Page, frameTime: number): Promise<Buffer | string>` block.

**Why**: Eliminates conditional branching on every frame tick in the hot loop.
**Risk**: None.

## Variations

### Variation A: Direct function assignment
If arrow functions somehow introduce closure overhead, an alternative is to assign the standard methods using `.bind(this)` (though historically this was slower).

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to verify DOM fallback capture succeeds.
Run `npx tsx tests/verify-canvas-selector.ts` to verify targeted element capture succeeds.

## Prior Art
PERF-201 originally attempted this using polymorphic assignment but was discarded. By using arrow functions, we aim to verify if the previous rejection was due to `.bind()` overhead.
