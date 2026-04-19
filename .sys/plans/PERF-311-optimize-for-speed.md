---
id: PERF-311
slug: optimize-for-speed
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-311: Enable `optimizeForSpeed` in `HeadlessExperimental.beginFrame` for DOM Capture

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `DomStrategy.ts`

## Background Research
During execution of `DomStrategy.capture`, frames are captured primarily using the CDP command `HeadlessExperimental.beginFrame`. In headless Chromium (especially when run with `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw`), the `beginFrame` command supports an `optimizeForSpeed` boolean flag in its screenshot parameter.

Profiling raw CDP calls with JPEG format reveals that setting `optimizeForSpeed: true` significantly decreases capture time. In a synthetic benchmark sending 100 `beginFrame` requests:
- With `optimizeForSpeed: true`: ~1952ms
- Without `optimizeForSpeed`: ~2075ms
- For PNG format, the difference is even more pronounced: ~1974ms vs ~3146ms.

By simply setting `optimizeForSpeed: true` in the `cdpScreenshotParams` object passed to `beginFrame`, we can yield a nearly "free" performance improvement without restructuring the capture loop or losing functionality.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.5s
- **Bottleneck analysis**: The cost of executing `HeadlessExperimental.beginFrame` inside the hot loop. The `page.screenshot` backup and default CDP capture can be further optimized at the Chrome level using `optimizeForSpeed`.

## Implementation Spec

### Step 1: Enable `optimizeForSpeed` in `cdpScreenshotParams`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare` method, where `cdpScreenshotParams` is defined, add `optimizeForSpeed: true`:

```typescript
<<<<<<< SEARCH
    const cdpScreenshotParams: any = { format };
=======
    const cdpScreenshotParams: any = { format, optimizeForSpeed: true };
>>>>>>> REPLACE
```

**Why**: This directly passes the flag to `HeadlessExperimental.beginFrame`, asking Chromium to prioritize rendering and screenshot encoding speed, saving significant time per frame on both JPEG and PNG captures.
**Risk**: Negligible. The flag is explicitly supported by Playwright's bundled Chromium and `HeadlessExperimental`. The canvas path is unaffected.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode remains functional.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to verify DOM capture correctly formats the response.
