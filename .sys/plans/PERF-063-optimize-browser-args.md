---
id: PERF-063
slug: optimize-browser-args
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---
# PERF-063: Optimize Default Browser Launch Arguments

## Focus Area
DOM Render Pipeline - Browser Launch & Process Architecture (`Renderer.ts`)

## Background Research
The `Renderer.ts` uses Chromium for DOM-to-Video capture. Headless Chromium spins up several isolated processes by default, many of which provide sandbox/security benefits or multi-site process isolation that are unnecessary in a local, single-site, local-file rendering context like the Jules microVM.

After iterating through several Chromium flags designed to limit overhead (`--single-process`, `--disable-features=AudioServiceOutOfProcess`), it was determined that the standalone `--disable-dev-shm-usage` flag marginally improved rendering execution time from ~32.3s down to **32.118s**.

This experiment intends to combine a suite of stable, well-known puppeteer/playwright "lightweight" chromium flags into the default launch arguments to verify if we can stack multiple micro-optimizations that strip out unnecessary browser background processes.

## Benchmark Configuration
- **Composition URL**: `examples/simple-animation/examples/simple-animation/output/build/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.25s
- **Bottleneck analysis**: IPC latency between Node and Chromium along with layout/paint calculation overhead in V8.

## Implementation Spec

### Step 1: Update Default Browser Arguments
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Append the following stable flags to `DEFAULT_BROWSER_ARGS`:
```javascript
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-default-apps',
  '--disable-sync',
  '--no-first-run',
  '--mute-audio',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-breakpad'
```

**Why**: These flags systematically disable background synchronization, crash reporting, plugin loading, and fallback networking routines inside Chromium. In a fixed-duration headless rendering loop on a CPU-bound microVM, any unnecessary background V8 thread activity or IPC ping overhead consumes CPU cycles that could otherwise be used for `HeadlessExperimental.beginFrame` execution.
**Risk**: Low. These flags are standard optimizations in the headless browser testing ecosystem.

## Variations
None.

## Correctness Check
Run `npx tsx test-render-3x.ts` (using the same baseline benchmark) and ensure the resulting video output is generated successfully without crashes or visually incorrect frames.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts` (which utilizes `SeekTimeDriver` inside canvas mode) to ensure hardware-accelerated modes are not impaired by these standard process restrictions.
