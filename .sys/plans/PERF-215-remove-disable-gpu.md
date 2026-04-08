---
id: PERF-215
slug: remove-disable-gpu
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-215: Remove `--disable-gpu` to Evaluate Hardware Acceleration Fallback

## Focus Area
Browser Architecture / Process Flags

The rendering pipeline heavily relies on headless Chromium to composite and capture frames. In a CPU-bound microVM environment without a hardware GPU, we currently run Chromium with `--disable-gpu`.
In `PERF-214`, we discovered that removing `--disable-gpu-compositing` improved performance. Variation A of that experiment suggested removing `--disable-gpu` entirely.

## Background Research
- `--disable-gpu` explicitly disables hardware GPU acceleration.
By removing this flag entirely, we allow Chromium to handle the software fallback automatically without explicit disable flags. Sometimes, explicit disable flags can bypass certain optimized fallbacks in Chromium.

## Baseline
- **Current estimated render time**: ~32.595s
- **Bottleneck analysis**: By explicitly disabling the GPU, we might be forcing a less optimal fallback path.

## Implementation Spec

### Step 1: Remove `--disable-gpu` from `GPU_DISABLED_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Remove the `--disable-gpu` string from the `GPU_DISABLED_ARGS` array.
**Why**: This allows Chromium to handle the software fallback automatically.
**Risk**: Chromium might fail to initialize or perform worse if it tries and fails to use hardware acceleration before falling back, adding overhead.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the Canvas path still works.

## Correctness Check
Run the `verify-cdp-driver.ts` and `verify-cdp-determinism.ts` scripts to ensure frame capture timing remains accurate. Run the main suite with `npx tsx packages/renderer/tests/run-all.ts` to catch any regressions.
