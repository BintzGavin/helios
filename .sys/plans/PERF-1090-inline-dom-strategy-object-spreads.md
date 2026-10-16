---
id: PERF-1090
slug: inline-dom-strategy-object-spreads
status: unclaimed
claimed_by: ""
created: 2024-10-16
completed: ""
result: ""
---

# PERF-1090: Inline DOM Strategy Object Spreads

## Focus Area
The `capture` method in `packages/renderer/src/strategies/DomStrategy.ts`. Specifically, optimizing the object spread operations for `Page.captureScreenshot` parameters inside the tight `capture` loop.

## Background Research
Currently, inside `DomStrategy.ts` the `capture` method dynamically constructs the `captureScreenshot` parameter object every single frame using nested object spreads:

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
        // ... watchdog
      ]);
// ...
```

While completely removing the watchdog timer (PERF-1088) failed because it might have altered the event loop/scheduling characteristics slightly, we can still optimize the parameter object allocation. The spread operators (`...`) create new objects and copy properties on every invocation. We can pre-calculate the complete parameter payload once in `prepare()` and reuse it directly, or conditionally inject only the required parts if mutability is a concern, but since `clip` and `cdpScreenshotParams` do not change per-frame, we can statically combine them.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s, h264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Object spread syntax inside the hot loop causes unnecessary V8 allocation overhead.

## Implementation Spec

### Step 1: Pre-calculate capture parameters
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add a private member to cache the final object:
`private cachedCaptureParams: any = null;`

At the very end of `prepare(page: Page)`, after all `cdpScreenshotParams` and `clip` properties are finalized, do:

```typescript
    this.cachedCaptureParams = {
      ...this.cdpScreenshotParams,
      fromSurface: true,
      ...(this.beginFrameParams.screenshot?.clip
        ? { clip: this.beginFrameParams.screenshot.clip }
        : {}),
    };
```

### Step 2: Use cached parameters in capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, replace the inline object spread with the cached object:

```typescript
<<<<<<< SEARCH
        this.cdpSession!.send('Page.captureScreenshot', {
          ...this.cdpScreenshotParams,
          fromSurface: true,
          ...(this.beginFrameParams.screenshot?.clip
            ? { clip: this.beginFrameParams.screenshot.clip }
            : {}),
        }),
=======
        this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams),
>>>>>>> REPLACE
```

**Why**: By caching the combined options object, we eliminate the per-frame overhead of object allocation and property copying, allowing V8 to use a hidden class for the stable object reference passed to the CDP session. This reduces garbage collection pressure without altering the Promise/async structure that the previous experiment (PERF-1088) touched.
**Risk**: None, as the configuration parameters are static after `prepare()` completes.
