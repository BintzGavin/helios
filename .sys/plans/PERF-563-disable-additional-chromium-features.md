---
id: PERF-563
slug: disable-additional-chromium-features
status: unclaimed
claimed_by: ""
created: 2024-06-13
completed: ""
result: ""
---

# PERF-563: Disable Additional Chromium Features

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Chromium launch arguments.

## Background Research
Currently, the `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts` includes `--disable-features=PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion`. In PERF-546, disabling site isolation via `--disable-site-isolation-trials` was tested but the flag `IsolateOrigins,site-per-process` in `--disable-features` wasn't added to the baseline. We should re-verify if appending these explicitly to the disabled features list provides any marginal benefit by ensuring these background processes are fully suppressed in the Chromium instance, freeing up resources for the deterministic `beginFrame` capture loop.

## Benchmark Configuration
- **Composition URL**: DOM benchmark composition (`examples/dom-benchmark/composition.html`)
- **Render Settings**: 600x600 resolution, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 0.622s
- **Bottleneck analysis**: Background Chromium noise and IPC overhead competing with the deterministic `beginFrame` capture loop.

## Implementation Spec

### Step 1: Append features to `--disable-features` flag
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Modify the `--disable-features` string in `DEFAULT_BROWSER_ARGS` to include additional features that are irrelevant to deterministic headless rendering.

Update the string from:
`'--disable-features=PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion'`

To:
`'--disable-features=PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion,IsolateOrigins,site-per-process'`

**Why**: Disabling more background services and unnecessary features reduces CPU and memory overhead, freeing up resources for the hot loop. `IsolateOrigins,site-per-process` ensures strict adherence to disabling site isolation mechanisms.
**Risk**: Disabling certain internal features might break Chromium's ability to launch or render content correctly in headless mode. If it crashes or hangs, the experiment should be discarded.

## Variations
None.

## Canvas Smoke Test
Run the Canvas strategy tests to ensure Chromium still launches and renders correctly.

## Correctness Check
Run the `DomStrategy` test suite to verify no regressions in capture logic.
