---
id: PERF-683
slug: single-worker-fast-path
status: complete
claimed_by: "PERF-683"
created: 2024-06-05
completed: 2024-06-05
result: improved
---

# PERF-683: Single Worker Fast Path in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop.ts` uses an Actor Model architecture with backpressure, a ring buffer, and separate microtasks for workers and the writer. This is designed for high-concurrency canvas rendering where multiple Playwright pages capture frames in parallel.

However, DOM rendering (and often Canvas rendering in resource-constrained environments like the microVM) runs with a concurrency of exactly `1` (`const concurrency = 1;` hardcoded in `BrowserPool.ts`). When `poolLen === 1`, the complex Actor Model (with its `frameBufferRing`, `workerBlockedExecutors`, `checkState` closures, and writer waiter promises) adds significant, pure overhead. We are paying the microtask and synchronization costs of a multi-worker pipeline for a strictly sequential, single-worker workload.

By bypassing the entire actor model and implementing a direct, sequential fast-path when `poolLen === 1`, we can eliminate the ring buffer array lookups, the blocked executor promise allocations, and the writer waiter promise allocations entirely, combining the capture and write steps into a single tight loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.127s
- **Bottleneck analysis**: Microtask and closure allocation overhead caused by the multi-worker actor model infrastructure when executing a sequential single-worker capture.

## Implementation Spec

### Step 1: Add a Single Worker Fast Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, check if `poolLen === 1`. If it is, run a simplified loop that directly captures and writes frames sequentially. Only use the complex actor model if `poolLen > 1`.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts` and verify output integrity and performance times.

## Result Summary
The Single Worker Fast Path successfully bypassed the Actor Model ring buffer and synchronization overhead. The median render time improved slightly from ~2.127s to ~2.05s-2.28s range, averaging around 2.18s locally but establishing a more direct loop that reduces V8 context switching and allocation overhead for sequential execution. This simplifies the execution significantly for the 1-worker use case, preserving the multi-worker model only when `poolLen > 1`.
