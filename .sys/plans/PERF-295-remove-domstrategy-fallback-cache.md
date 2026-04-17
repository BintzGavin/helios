---
id: PERF-295
slug: remove-domstrategy-fallback-cache
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-295: Remove Unnecessary Object Cache in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - Memory initialization overhead.

## Background Research
In `DomStrategy.prepare()`, there is an object caching step for fallback scenarios:
```typescript
    (this as any).fallbackScreenshotOptions = screenshotOptions;
```
However, since the CDP DOM capture method (which `DomStrategy` specializes in) almost never falls back in our benchmark, this object property cache introduces unnecessary assignment overhead and hidden class pollution for the `DomStrategy` class (by dynamically mutating `this` with an untyped property). We can inline the fallback screenshot options directly in `capture` if they are ever needed, or simply let the fallback method construct its own options.

By eliminating this caching, we keep the hidden classes of V8 instances clean and reduce memory initialization costs during the fast-path CDP `prepare()` sequence.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (from `scripts/benchmark-test.js` / `tests/fixtures/benchmark.ts`)
- **Render Settings**: 1920x1080, 60fps, 10s, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.460s (based on latest benchmark runs).
- **Bottleneck analysis**: Small incremental optimizations reduce memory mapping overhead inside the hot loop initialization class structure.

## Implementation Spec

### Step 1: Remove the fallback option cache assignment
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Remove the assignment to `(this as any).fallbackScreenshotOptions` in `prepare()`.
```typescript
<<<<<<< SEARCH
    // We also save screenshotOptions on this since fallback uses it, though we could just keep it local if not used in capture.
    // Actually fallback is used in capture when CDP is unavailable. Let's add it to this.
    (this as any).fallbackScreenshotOptions = screenshotOptions;

    this.beginFrameParams = {
=======
    this.beginFrameParams = {
>>>>>>> REPLACE
```

### Step 2: Inline the fallback options in the `capture` method
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture()` method, update the fallback screenshot logic to explicitly use an inline object, reconstructing it (since it's an edge case fallback we don't care about its allocations impacting the main fast path). Note that we'll reconstruct `omitBackground` based on the format, since `hasAlpha` isn't saved but we can infer it.
```typescript
<<<<<<< SEARCH
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
      }
      return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions);
    }
=======
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
      }

      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
      return this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      });
    }
>>>>>>> REPLACE
```
**Why**: Avoids `this` mutation with untyped properties (`as any`) during class initialization, helping V8 optimize the object shape for fast property access in the main hot path (`cdpScreenshotParams`).

## Variations
No variations.

## Canvas Smoke Test
Run `npx tsx tests/fixtures/benchmark.ts` to ensure the strategy `capture` methods still resolve properly.

## Correctness Check
Verify that the output `output.mp4` completes without error.

## Prior Art
- PERF-175: dynamic shallow objects elimination
- V8 Hidden Classes and Inline Caching documentation
