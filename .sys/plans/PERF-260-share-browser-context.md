---
id: PERF-260
slug: share-browser-context
status: complete
completed: "$(date -I)"
result: "kept"
claimed_by: "executor-session"
created: 2024-06-03
---

## Results Summary
- **Best render time**: 47.634s
- **Improvement**: ~3.6%
- **Kept experiments**: Shared BrowserContext across workers
- **Discarded experiments**: None

# PERF-260: Share Browser Context

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
- **Current estimated render time**: ~2.101s (from PERF-255)
- **Bottleneck analysis**: Context switching and memory overhead of managing multiple isolated Playwright contexts.

## Implementation Spec

### Step 1: Create a single BrowserContext
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
- Move `this.browser!.newContext(...)` outside of the `createPage` loop in `init()`.
- Create a single `sharedContext` before the loop.
- Have all workers use `sharedContext.newPage()` instead of `this.browser!.newContext()`.
**Why**: Reusing the same context avoids the overhead of Chromium spinning up isolated sessions, caches, and potentially processes, reducing CPU and memory load.

### Step 2: Ensure correct context tracking
- Update `WorkerInfo` to still keep track of the context.
- Update `close()` method to only close the `sharedContext` once, instead of looping over all workers to close their contexts (which would be redundant and possibly throw errors if already closed).

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts`.

## Correctness Check
Run the test suite `cd packages/renderer && npx tsx tests/run-all.ts` (or specific tests) or check the output video visually.
