---
id: PERF-567
slug: cdp-capture-screenshot
status: unclaimed
claimed_by: ""
created: 2024-05-22
completed: ""
result: ""
---

# PERF-567: Test `Page.captureScreenshot` vs `HeadlessExperimental.beginFrame`

## Focus Area
The Frame Capture Loop (phase 4) in `DomStrategy.ts`. The current implementation relies on `HeadlessExperimental.beginFrame` to capture frames deterministically.

## Background Research
Currently, `DomStrategy` uses Playwright's `HeadlessExperimental.beginFrame` to capture frames via CDP. While we optimized this heavily (e.g., PERF-561 explicitly sets `noDisplayUpdates: false`), `beginFrame` still has a minimum latency floor in Chromium. A previous note in `RENDERER-EXPERIMENTS.md` (PERF-008) mentioned "raw CDP capture fallback instead of page.screenshot" as something that works. We will test replacing `HeadlessExperimental.beginFrame` entirely with `Page.captureScreenshot` combined with the existing `CdpTimeDriver.ts` virtual time advancement, to see if raw capture is faster than the deterministic `beginFrame` pipeline when time is already manually controlled.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600 resolution, 30 FPS, 150 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~0.960s (after PERF-565 reverted the blank video bug).
- **Bottleneck analysis**: The ~20-30ms per-frame overhead of `HeadlessExperimental.beginFrame` remains a significant portion of the total render time.

## Implementation Spec

### Step 1: Swap Capture Mechanism
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. In `prepare()`, remove the initialization of `beginFrameParams` and `targetBeginFrameParams`.
2. In `capture()`, instead of calling `HeadlessExperimental.beginFrame`, call `Page.captureScreenshot` via the CDP session (`this.cdpSession!.send('Page.captureScreenshot', { format, quality, clip })`).
**Why**: `Page.captureScreenshot` may bypass the specific compositor synchronization overhead associated with `beginFrame` and return base64 image data faster since time is already paused and advanced explicitly by `CdpTimeDriver`.
**Risk**: Frame synchronization might tear or lag if `captureScreenshot` captures before the DOM finishes layout for the current virtual time tick, leading to duplicated or dropped visual frames.

## Variations
### Variation A: Use `optimizeForSpeed`
If `Page.captureScreenshot` supports the `optimizeForSpeed` flag (similar to what we use now in `cdpScreenshotParams`), ensure it is set to `true`.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- tests/verify-codecs.ts` to ensure Canvas mode isn't accidentally affected.

## Correctness Check
Run a visual check on the output video of `examples/dom-benchmark` to ensure frames are not torn or skipping. Run `npm run test -w packages/renderer` to ensure baseline rendering is not broken.
