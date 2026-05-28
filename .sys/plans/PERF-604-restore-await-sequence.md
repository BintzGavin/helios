---
id: PERF-604
slug: restore-await-sequence
status: complete
claimed_by: "jules"
created: 2026-05-28
completed: 2026-05-28
result: "discard (median: 1.590s)"
---

# PERF-604: Restore await sequence in runWorker for modern V8

## Focus Area
DOM Rendering Pipeline - Output writing and worker loops in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
A previous experiment (PERF-584) replaced explicit `await` statements wrapped in a `try/catch` with a `.then().catch()` promise chain wrapped in a single `await` inside the `runWorker` hot loop. It achieved a speedup at the time. However, modern V8 heavily optimizes native `await` and `try/catch` inside `async` generators, whereas `.then()` chains unavoidably allocate closure environments for their handlers (e.g., `() => strategy.capture(page, time)`), which creates short-lived objects on the heap during every frame iteration, increasing garbage collection pressure.
By converting this back to a linear `await` sequence wrapped in `try/catch`, we can eliminate all per-frame closure allocations in this hot path, allowing V8 to use its highly optimized `async` state machine without accumulating garbage.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.267s
- **Bottleneck analysis**: Allocation of `.then()` closures on every frame inside the `runWorker` asynchronous loop, causing V8 garbage collection overhead.

## Implementation Spec

### Step 1: Replace `.then()` chain with native `await` sequence
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` method, replace the `timePromise` chain with a `try/catch` using native `await`s.

## Correctness Check
Run the `npx tsx packages/renderer/tests/run-all.ts` to verify output correctly retains all frames and avoids truncation.
