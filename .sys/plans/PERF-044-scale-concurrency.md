---
id: PERF-044
slug: scale-concurrency
status: complete
claimed_by: "executor-session"
created: 2026-10-18
completed: 2026-10-18
result: no-improvement
---
# PERF-044: Scale Concurrency via Multiple Browser Instances

## Focus Area
Frame Capture Loop & Headless Browser IPC Concurrency.

## Background Research
Through performance profiling of the `Page.captureScreenshot` bottleneck in a CPU-bound environment, we discovered that Chromium instances serialize CDP capture commands heavily when utilizing a single browser process (even across multiple contexts or pages). In our micro-benchmarks, pipelining 300 frame captures on 4 pages within a single browser took ~2600ms. However, distributing the same workload across 4 distinct `chromium.launch` instances executed in ~1550ms — a ~40% reduction in pure capture time. Because `Renderer.ts` currently instantiates a single browser and a single context for all worker pages, it artificially constrains CPU scaling for headless layout and screenshot generation. By instantiating a separate browser process for each worker in the pool, we can fully saturate the available cores.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/output/example-build/composition.html`
- **Render Settings**: 600x600, 30fps, 150 frames (5 seconds), JPEG intermediate format
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.4s
- **Bottleneck analysis**: Single browser process limits concurrent layout, paint, and CDP frame captures.

## Implementation Spec

### Step 1: Instantiate Multiple Browser Instances
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
1. Remove the single `browser = await chromium.launch(...)` and `context = await browser.newContext(...)` calls from the top of the `render` method.
2. Inside `createPage` (or in a mapped Promise array beforehand), instantiate a new browser and a new context for each worker in the pool.
3. Update the pool object to store the `browser`, `context`, and `page` so they can be properly cleaned up.
4. In the `finally` block of `render`, loop over the pool and call `await worker.context.close()` and `await worker.browser.close()`.

*Note:* Keep `diagnose()` unchanged, as it only needs a single temporary browser instance.

**Why**: Bypasses the single-process serialization bottleneck in Chromium's CDP/layout queue, allowing true multi-core concurrent frame captures.
**Risk**: Increased memory footprint and process overhead during startup. The ephemeral microVM environment has enough memory to support several headless Chromium instances without thrashing.

## Variations
### Variation A: Multiple Contexts per Browser
If launching N browsers consumes too much memory, we could launch `N/2` browsers and run 2 contexts per browser. However, the Executor should try 1 browser per worker first, bounded by `Math.min(Math.ceil(cpus * 1.5), 8)`.

## Canvas Smoke Test
Run the Canvas baseline script to ensure basic rendering still works.
`npx tsx packages/renderer/scripts/render.ts`

## Correctness Check
Run the DOM render script and verify output exists and has valid video contents.
`npx tsx packages/renderer/scripts/render-dom.ts`

## Prior Art
- PERF-015: Introduced the sliding-window page pool.
- PERF-027: Optimized page pool concurrency by oversubscribing CPU cores.

## Results Summary
- **Best render time**: 33.563s (vs baseline ~32.4s)
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: Scale concurrency via multiple browser instances (PERF-044).
