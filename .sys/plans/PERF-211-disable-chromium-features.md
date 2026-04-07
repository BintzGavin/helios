---
id: PERF-211
slug: disable-chromium-features
status: complete
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-211: Disable unused Chromium features

## Focus Area
DOM Rendering Pipeline - Playwright Browser Setup (`BrowserPool.ts`)

## Background Research
Currently, `BrowserPool.ts` launches Chromium instances with a set of `DEFAULT_BROWSER_ARGS`. However, checking the flags, there is an opportunity to disable a few more default Chromium behaviors that are completely unnecessary for headless rendering and consume unnecessary CPU/Memory during browser instantiation and process execution. The `DOM` render pipeline does not require background sync, hardware media keys, client side phishing detection, default apps, etc.
We will add standard Playwright/Puppeteer flags to achieve a lighter browser:
- `--disable-features=AudioServiceOutOfProcess,PaintHolding` (this can improve rendering performance by making Audio Service in-process and disabling Paint Holding which is for visual transitions between pages, not needed for DOM rendering).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.7s
- **Bottleneck analysis**: Context switching and memory overhead of Chromium processes.

## Implementation Spec

### Step 1: Add new flags to `DEFAULT_BROWSER_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Add the following flag to the `DEFAULT_BROWSER_ARGS` array:
- `'--disable-features=AudioServiceOutOfProcess,PaintHolding'`

**Why**: Disabling more background features and keeping the audio service in-process reduces the process count and overhead of Chromium.
**Risk**: If any feature relies on the AudioService being out-of-process, it could break, but standard Web Audio API and HTML5 Audio usually work fine in-process. Paint Holding disablement is safe since we don't navigate between pages visually.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts`.

## Correctness Check
Run the tests using `npx tsx packages/renderer/tests/run-all.ts` to ensure no functionality is broken by the new flags.