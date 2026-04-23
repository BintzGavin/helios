---
id: PERF-345
slug: eliminate-capture-await
status: complete
claimed_by: "executor-session"
created: 2024-05-18
completed: "2024-05-18"
result: "no-improvement"
---

# PERF-345: Eliminate `async`/`await` overhead in `DomStrategy.capture()`

## Focus Area
`DomStrategy.ts` single-frame capture hot path. Specifically, avoiding the generator and dynamic closure overhead of the `async`/`await` pattern during `capture()`.

## Background Research
Currently, `DomStrategy.capture()` is defined as an `async` function. It does:
```typescript
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    }
    return this.lastFrameData!;
```
Every time it is called (which is once per frame per worker), V8 has to set up a new async generator context and allocate implicit Promise closures for the continuation. Since `cdpSession.send` already returns a `Promise`, we can refactor `capture()` to be a regular method that returns `Promise<Buffer | string>` and pre-bind the `.then()` handler to avoid inline anonymous closure allocations (`.then(res => ...)`). This avoids creating the inline closure and avoids the generator `async`/`await` state machine altogether in the hottest path.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A
- **Bottleneck analysis**: Micro-optimizing V8 GC churn by avoiding dynamic `.then` closure allocation and async/await state machine in the capture loop.

## Implementation Spec

### Step 1: Add a pre-bound handler in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add a class property `handleCaptureResponse` to handle the response from CDP:
```typescript
  private handleCaptureResponse = (res: any): Buffer | string => {
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    }
    return this.lastFrameData!;
  };
```

### Step 2: Refactor `capture` to remove `async`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove the `async` keyword from `capture(page: Page, frameTime: number): Promise<Buffer | string>`.
2. For the `targetElementHandle` logic, change it to:
```typescript
    if (this.targetElementHandle) {
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;
        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
          .then(this.handleCaptureResponse);
      }

      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
      return this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      }).then(res => {
        if (res) {
          this.lastFrameData = res;
          return res;
        }
        return this.lastFrameData!;
      });
    }
```
3. For the default logic, change it to:
```typescript
    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(this.handleCaptureResponse);
```
**Why**: Avoids dynamic closure and `async` generator overhead on every frame.
**Risk**: None, `targetElementHandle.screenshot` uses an inline `.then` but it is an uncommon fallback path so its GC impact is irrelevant.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`

## Prior Art
- PERF-277 initially used `await` over `.then()` but didn't combine it with pre-bound closures.
- Pre-binding executor handlers (e.g., PERF-324, PERF-343) consistently improves GC pressure and render times.

## Results Summary
- **Best render time**: 46.805s (vs baseline 47.013s)
- **Improvement**: ~0.4% (inconclusive, within noise margin)
- **Kept experiments**: none
- **Discarded experiments**: Eliminate `async`/`await` generator overhead in single-frame `capture()`.
