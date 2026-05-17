---
id: PERF-529
slug: process-per-tab
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-529: Isolate Renderers with --process-per-tab

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Browser launch arguments.

## Background Research
Currently, the `BrowserPool` launches a single Chromium browser process and creates multiple `Page` objects (workers) that load the exact same local composition URL (`file://...`). To save memory, the current configuration passes `--disable-site-isolation-trials` and `--disable-features=IsolateOrigins,site-per-process...`.
Because all pages share the same origin and site isolation is disabled, Chromium forces all these workers into a **single shared renderer process**.
Inside this single renderer process, the V8 isolate and the compositor main thread are shared. This means that when our Node.js orchestrator assigns frames to 3 workers in parallel, Chromium can only process them sequentially on its main thread, entirely defeating the purpose of a multi-worker pool and leaving the other CPU cores idle during the `HeadlessExperimental.beginFrame` hot loop.

PERF-505 attempted to fix this by using dedicated `BrowserContext`s, but pages with the same origin in different contexts can still share renderer processes in some configurations, or hit other Playwright overheads. PERF-526 proposed launching entirely separate `Browser` instances (multiple `chromium.launch()` calls), which would guarantee isolation but duplicate the heavy Browser and GPU processes, risking memory exhaustion.

A much cleaner approach is to use the native Chromium flag `--process-per-tab`. This flag forces Chromium to create a dedicated OS-level renderer process for every `Page` (tab), regardless of origin or context. We must also remove the flags that disable site isolation, as they might conflict with or override `--process-per-tab`. This gives us true parallel frame capture across all CPU cores with minimal memory overhead.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~16.306s
- **Bottleneck analysis**: Thread contention inside the single shared Chromium renderer process when multiple workers concurrently request `HeadlessExperimental.beginFrame`.

## Implementation Spec

### Step 1: Update Browser Launch Arguments
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In the `DEFAULT_BROWSER_ARGS` array:
1. Remove `--disable-site-isolation-trials`.
2. Remove `--disable-features=IsolateOrigins,site-per-process,PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion`.
3. Add `--process-per-tab`.
4. (Optional but recommended) Re-add the non-isolation related disabled features to maintain performance: `--disable-features=PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion`.

```typescript
<<<<<<< SEARCH
  '--run-all-compositor-stages-before-draw',
  '--disable-site-isolation-trials',
  '--disable-features=IsolateOrigins,site-per-process,PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion',
  '--disable-lcd-text',
=======
  '--run-all-compositor-stages-before-draw',
  '--process-per-tab',
  '--disable-features=PaintHolding,Translate,OptimizationHints,OptimizationGuideModelDownloading,CalculateNativeWinOcclusion',
  '--disable-lcd-text',
>>>>>>> REPLACE
```

**Why**: `--process-per-tab` guarantees that each worker `Page` gets its own dedicated Chromium renderer process (and therefore its own main thread and V8 isolate), enabling true parallel multi-core processing of `HeadlessExperimental.beginFrame`.
**Risk**: Slight increase in memory usage since each worker now has its own renderer process, but it should be significantly less than launching entirely separate `Browser` instances.

## Variations
- If memory usage spikes too high, reduce `concurrency` in `BrowserPool.ts` from `Math.max(1, (os.cpus().length || 4) - 1)` to a lower bound.

## Canvas Smoke Test
Run canvas benchmarks to ensure `BrowserPool` correctly provisions instances.

## Correctness Check
Run the DOM benchmark and inspect `output.mp4` to verify that all frames were correctly ordered and written without drops.
