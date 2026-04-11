---
id: PERF-243
slug: reduce-worker-concurrency
status: unclaimed
claimed_by: ""
created: "2026-04-11"
completed: ""
result: ""
---

# PERF-243: Evaluate Minimal Worker Concurrency (Single Page)

## Focus Area
DOM Rendering Pipeline - Playwright Worker Concurrency in `packages/renderer/src/core/BrowserPool.ts`.

## Background Research
In headless CPU-bound environments (especially without hardware acceleration where SwiftShader runs on CPU), Chromium processes heavily contend for resources with the Node.js orchestration loop and the multithreaded FFmpeg encoder.
Previously (PERF-237), worker concurrency was reduced from `Math.min(cores, 8)` to `Math.max(1, Math.floor(cores / 2))`. However, profiling shows that running even 2 headless pages in parallel can cause significant thrashing and micro-stalls across the system.
Playwright/Chromium CDP frame capture (`beginFrame`) and layout evaluation are fundamentally synchronous within a page but parallelizable across pages. Yet, if the system is starved for CPU cycles, executing a single Chromium page sequentially might actually improve wall-clock throughput by allowing the page to execute its rendering and compositing pipelines without context-switching interruptions.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.0s (noisy environment)
- **Bottleneck analysis**: Heavy CPU context switching between 2 Playwright pages, Node.js event loop, and FFmpeg threads.

## Implementation Spec

### Step 1: Set explicit concurrency to 1
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Change the `concurrency` definition from:
```typescript
    const concurrency = Math.max(1, Math.floor((os.cpus().length || 4) / 2));
```
to explicitly cap at 1:
```typescript
    const concurrency = 1;
```

**Why**: By running a single Chromium worker, we eliminate inter-page contention and give the OS scheduler an easier time balancing the single renderer process, Node.js loop, and FFmpeg. We hypothesize that on our CPU-bound VM, 1 worker will execute faster wall-clock time than 2 concurrent workers.
**Risk**: On machines with many idle cores, this will artificially underutilize the system. However, for standard execution environments, it might be the optimal configuration. If this degrades performance, we will discard it.

## Variations
- Test `concurrency = 2` explicitly if 1 degrades too much on certain topologies.

## Canvas Smoke Test
N/A - the configuration affects both DOM and Canvas similarly but does not break syntax.

## Correctness Check
Run the DOM render tests to ensure 1 worker correctly processes all frames in order.

## Prior Art
- PERF-237: Optimize BrowserPool Concurrency Heuristic (halved cores).
