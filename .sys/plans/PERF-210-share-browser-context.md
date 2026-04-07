---
id: PERF-210
slug: share-browser-context
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-210: Share Browser Context

## Focus Area
DOM Rendering Pipeline - Playwright Browser Setup

## Background Research
Currently, the `BrowserPool` creates a completely isolated `BrowserContext` for every single concurrent worker page (`concurrency = min(os.cpus().length, 8)`). This is a heavy operation that creates isolated storage, caches, and potentially separate renderer processes within Chromium, increasing memory pressure and context switching overhead in the CPU-bound microVM.
By sharing a *single* `BrowserContext` across all worker pages, we should reduce the memory footprint and the overhead of establishing multiple contexts. The pages will simply be tabs within the same context. Since `DOM` rendering captures a static frame and advances time, and there is no cross-worker state contamination expected from `helios`, a shared context is perfectly safe.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (e.g., examples/simple-animation)
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.7s (baseline with software rasterizer from PERF-208)
- **Bottleneck analysis**: Context switching and memory overhead of managing multiple isolated Playwright contexts.

## Implementation Spec

### Step 1: Create a single BrowserContext
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
- Move `this.browser!.newContext(...)` outside of the `createPage` loop in `init()`.
- Create a single `sharedContext` before the loop.
- Have all workers use `sharedContext.newPage()` instead of `this.browser!.newContext()`.
**Why**: Reusing the same context avoids the overhead of Chromium spinning up isolated sessions, caches, and potentially processes, reducing CPU and memory load.
**Risk**: If tracing is enabled per-worker, it might trace the entire context and overlap data. We must ensure tracing is either handled correctly or scoped. (The current implementation enables tracing on the `pageContext`. It may capture all pages, which is acceptable for diagnostics).

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts`.

## Correctness Check
Run the `npx tsx packages/renderer/tests/fixtures/benchmark.ts` test or check the output video visually.