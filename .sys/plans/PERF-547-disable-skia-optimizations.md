---
id: PERF-547
slug: disable-skia-optimizations
status: claimed
claimed_by: "executor-session"
created: 2024-05-19
completed: 2024-05-19
result: failed
---

# PERF-547: Disable Skia Wait and Color Profile Overheads

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Chromium launch arguments.

## Background Research
In our completely headless, software-rendering environment, Chromium's compositor and Skia graphics library still perform work that is primarily beneficial for on-screen display or multi-process synchronization. Two specific flags target these hidden overheads:
1. `--disable-color-correct-rendering`: Prevents Skia from performing color profile conversions. Since we want raw pixels and deterministic output without OS color management, this skips a CPU-intensive step during `beginFrame` capture.
2. `--disable-skia-runtime-opts`: Disables some dynamic Skia runtime optimizations that can actually add overhead or de-optimize in an isolated, short-lived headless microVM environment running strictly on software rasterization.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s (PERF-542)
- **Bottleneck analysis**: CPU overhead within the headless Chromium compositor and Skia graphics layer during high-frequency screenshot generation.

## Implementation Spec

### Step 1: Append Disable Skia/Color Arguments
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Update the `DEFAULT_BROWSER_ARGS` array to include `--disable-color-correct-rendering` and `--disable-skia-runtime-opts`.

### Step 2: Ensure tests run correctly
Use `run_in_bash_session` to run `npm run test -w packages/renderer -- --run` and safely acknowledge the expected timeout.

### Step 3: Complete pre-commit steps
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

### Step 4: Submit change
Submit the plan via PR.

## Results Summary
- **Best render time**: 10.306s (vs baseline 10.002s)
- **Improvement**: -3.0%
- **Kept experiments**:
- **Discarded experiments**: added disable-color-correct-rendering and disable-skia-runtime-opts
