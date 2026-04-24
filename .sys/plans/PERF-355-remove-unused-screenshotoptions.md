---
id: PERF-355
slug: replace-screenshot-options-with-cdp
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-355: Remove unused `screenshotOptions` allocation in `DomStrategy.ts`

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `prepare` method.

## Background Research
In `DomStrategy.ts`'s `prepare` method, we create and populate a `screenshotOptions` object. This was historically used to configure Playwright's `page.screenshot()` parameters. However, in recent iterations (PERF-002 and subsequent), we shifted to raw CDP `HeadlessExperimental.beginFrame` and manually configured `this.cdpScreenshotParams`.

Even when `this.targetElementHandle` uses the Playwright `.screenshot()` fallback, it constructs its own literal `{ type: this.cdpScreenshotParams.format, quality: this.cdpScreenshotParams.quality, omitBackground: !isOpaque }` directly inside `capture()`.

The `screenshotOptions` object in `prepare()` is now completely unused. It allocates a small object and performs string comparisons, adding slight overhead during the initialization phase (Phase 3). While not in the hot loop, cleaning this up adheres to the "Simplicity as tiebreaker" principle and removes dead code.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s (from PERF-348)
- **Bottleneck analysis**: Micro-optimizing initialization phase, reducing V8 memory footprint and parsing overhead.

## Implementation Spec

### Step 1: Remove `screenshotOptions` initialization
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, remove the allocation and population of `screenshotOptions`.

```typescript
<<<<<<< SEARCH
    const screenshotOptions: any = {
      type: format,
    };

    if (format === 'jpeg' || format === 'webp') {
      if (quality !== undefined) {
        screenshotOptions.quality = quality;
      }
    }

    if (format !== 'jpeg') {
      screenshotOptions.omitBackground = hasAlpha;
    }

    const cdpScreenshotParams: any = { format, optimizeForSpeed: true };
=======
    const cdpScreenshotParams: any = { format, optimizeForSpeed: true };
>>>>>>> REPLACE
```

**Why**: Code simplicity, removal of unused allocations.
**Risk**: None. It's unused.

## Variations
None.

## Canvas Smoke Test
N/A (`DomStrategy`).

## Correctness Check
Run the DOM render benchmark script multiple times to verify rendering is unaffected.

## Prior Art
N/A
