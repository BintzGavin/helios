---
id: PERF-1088
slug: optimize-dom-strategy-capture-allocations
status: unclaimed
claimed_by: ""
created: 2024-10-16
completed: ""
result: ""
---

# PERF-1088: Optimize DOM Strategy Capture Allocations

## Focus Area
The `capture` method in `packages/renderer/src/strategies/DomStrategy.ts`. Specifically, removing the per-frame `Promise.race` watchdog timer and hoisting the evaluation of `Page.captureScreenshot` parameters to reduce object allocations and GC pressure in the hot loop.

## Background Research
Currently, inside `DomStrategy.ts` the `capture` method looks like this:

```typescript
  async capture(page: Page, frameTime: number): Promise<any> {
    const timeoutMs = this.options.stabilityTimeout ?? 30000;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        this.cdpSession!.send('Page.captureScreenshot', {
          ...this.cdpScreenshotParams,
          fromSurface: true,
          ...(this.beginFrameParams.screenshot?.clip
            ? { clip: this.beginFrameParams.screenshot.clip }
            : {}),
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(
              `DomStrategy.capture watchdog: Page.captureScreenshot exceeded ${timeoutMs}ms (frameTime=${frameTime})`
            ));
          }, timeoutMs);
        }),
      ]);

      return {
        hasDamage: true,
        screenshotData: result.data,
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
```

This method is called for *every single frame*. The current implementation:
1. Re-evaluates parameter objects (using object spread `...this.cdpScreenshotParams`, and conditional spreads `...(this.beginFrameParams...)`).
2. Creates a new `Promise.race` array.
3. Allocates a new closure and a new `setTimeout` (watchdog) for every frame.
4. Always enters a `finally` block to clear the timeout.

By removing the per-frame watchdog timer (which was likely intended for early debugging or initialization phases and isn't strictly necessary for every frame capture on an established CDP connection) and pre-computing the exact screenshot parameter payload in `prepare()`, we eliminate multiple allocations per frame. This will directly decrease GC pressure in the V8 engine and tighten the loop execution.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s, h264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 heap and JS execution overhead per frame inside `capture()`. Eliminating closures, spreads, and timers simplifies the JIT execution tree.

## Implementation Spec

### Step 1: Hoist and cache `captureParams` in `prepare`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add a new class property: `private captureParams: any = null;`

At the end of the `prepare` method, construct the exact parameters needed for the `captureScreenshot` call and cache it:

```typescript
    this.captureParams = {
      ...this.cdpScreenshotParams,
      fromSurface: true,
      ...(this.beginFrameParams.screenshot?.clip
        ? { clip: this.beginFrameParams.screenshot.clip }
        : {}),
    };
```
**Why**: This calculates the object spread once during setup instead of N times (where N is the number of frames), eliminating unnecessary heap allocations during the hot loop.
**Risk**: None. The `cdpScreenshotParams` and `clip` parameters are static after `prepare()` completes.

### Step 2: Streamline `capture` method
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Replace the `capture` method with:

```typescript
  async capture(page: Page, frameTime: number): Promise<any> {
    const result = await this.cdpSession!.send('Page.captureScreenshot', this.captureParams);

    return {
      hasDamage: true,
      screenshotData: result.data,
    };
  }
```
**Why**: Removes `Promise.race`, anonymous functions, closures, `setTimeout`, `clearTimeout`, and dynamic object creation per frame.
**Risk**: If CDP completely hangs during rendering, the renderer might stall indefinitely instead of failing after `stabilityTimeout` ms. However, a complete CDP stall on a synchronous capture pipeline is exceptionally rare outside of catastrophic browser crashes, and removing the micro-overhead is more valuable for raw rendering speed.

## Correctness Check
Run the DOM render verify command and standard test suite to ensure screenshots are still captured correctly.
