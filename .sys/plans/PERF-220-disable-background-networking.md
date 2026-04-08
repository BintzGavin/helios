---
id: PERF-220
slug: test-remove-background-networking
status: complete
claimed_by: "executor-session"
created: 2024-06-04
completed: "2026-04-08"
result: "no-improvement"
---

# PERF-220: Test removing background networking flags

## Focus Area
Chromium Launch Configuration in `BrowserPool.ts`.

## Background Research
The `DEFAULT_BROWSER_ARGS` in `packages/renderer/src/core/BrowserPool.ts` currently includes `--disable-background-networking` and `--disable-background-timer-throttling`. While these are standard headless optimization flags, they might unexpectedly disable internal network optimizations or caching mechanisms that could speed up asset loading during the `Page Setup` phase (e.g. Navigation, init scripts, network idle). It is worth testing if removing these flags improves overall wall-clock render time, especially considering the interaction with virtual time progression.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s
- **Bottleneck analysis**: Page Setup and Strategy Preparation phases could be impacted by network optimizations.

## Implementation Spec

### Step 1: Remove background flags from `DEFAULT_BROWSER_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Remove the following flags from the `DEFAULT_BROWSER_ARGS` array:
- `'--disable-background-networking'`
- `'--disable-background-timer-throttling'`

**Why**: Allowing background networking and background timer throttling might actually improve the performance of asset loading and background processes in Chromium, reducing the time spent waiting for network idle before the capture loop begins.
**Risk**: Background processes might consume CPU cycles, potentially slowing down the capture loop.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/run-all.ts`.

## Correctness Check
Run the DOM render tests to ensure no visual regressions break tests.

## Results Summary
- **Best render time**: 32.552s (baseline)
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: Remove background networking flags (no meaningful improvement)
