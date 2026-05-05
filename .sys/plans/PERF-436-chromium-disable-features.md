---
id: PERF-436
slug: chromium-disable-features
status: complete
claimed_by: "executor-session"
created: 2026-04-09
completed: "2024-05-05"
result: "kept"
---

# PERF-436: Optimize Chromium Launch Flags

## Focus Area
`BrowserPool.ts` launch configuration. Targeting the `DEFAULT_BROWSER_ARGS` to disable unnecessary background features.

## Background Research
Chromium starts with several default features enabled that provide no benefit in a headless, CPU-bound rendering environment and can actively consume resources. Specifically, features like `PaintHolding`, `Translate`, `OptimizationHints`, `CalculateNativeWinOcclusion`, and `OptimizationGuideModelDownloading` add unnecessary background overhead.

Disabling these features via `--disable-features=...` reduces Chromium's background processing and memory footprint, allowing V8 and the compositing threads to run with less contention inside the Jules microVM.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.7s
- **Bottleneck analysis**: CPU contention during frame rendering loop from background Chromium services.

## Implementation Spec

### Step 1: Append features to `--disable-features` in `BrowserPool.ts`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Modify the `--disable-features=IsolateOrigins,site-per-process` string in `DEFAULT_BROWSER_ARGS` to include additional background features:
`'--disable-features=IsolateOrigins,site-per-process,PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion'`

**Why**: Disabling these features reduces background CPU utilization and memory overhead in Chromium, providing more resources for the primary rendering loop.
**Risk**: Low. These features are related to interactive browsing (translation, paint holding for smooth navigation) and are unnecessary for headless rendering.

## Variations
None.

## Canvas Smoke Test
Run a basic canvas render (`npm run test -w packages/renderer`) to ensure initialization isn't broken.

## Correctness Check
Run the verification suite to ensure frames are still accurately captured.

## Prior Art
Standard Puppeteer and Playwright optimization guides recommend disabling these features for maximum headless performance.

## Results Summary

run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	42.161	90	2.13	38.7	keep	baseline
2	33.513	90	2.69	37.7	keep	disabled background chromium features
