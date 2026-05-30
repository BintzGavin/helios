---
id: PERF-621
slug: bypass-v8-idle-tasks
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-621: Disable V8 Idle Tasks Revisited

## Focus Area
DOM Rendering Pipeline - Chromium Browser Args in `packages/renderer/src/core/BrowserPool.ts`.

## Background Research
PERF-558 tested `--disable-v8-idle-tasks` and discarded it because it regressed performance in the context of the previous architecture. However, we've recently discovered that microtask queuing and garbage collection pressure in V8 is a significant bottleneck. With recent optimizations like PERF-614 reducing promise allocations and GC pressure natively, disabling idle tasks might now yield a different outcome. It could prevent Chromium from triggering background GC pauses during the highly deterministic and fast `beginFrame` loop. Another similar flag to test is `--disable-background-gc`.

Let's test this isolated change again on the new highly optimized baseline.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/output/example-build/composition.html`)
- **Render Settings**: Standard microVM constraints.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.605s (recent measurement after npm install)
- **Bottleneck analysis**: V8 garbage collection and idle background tasks in the headless Chromium instance might cause micro-stutters.

## Implementation Spec

### Step 1: Add Chromium flags
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Add `--disable-v8-idle-tasks` and `--disable-background-gc` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: Prevent V8 from executing idle tasks or background garbage collection during our highly intensive, deterministic frame capture loop.
**Risk**: Might cause memory accumulation, but since our sessions are short-lived, this might be a beneficial tradeoff for pure speed.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance and verify correct output.

## Variations
### Variation A: Only --disable-v8-idle-tasks
Try only `--disable-v8-idle-tasks`.

### Variation B: Only --disable-background-gc
Try only `--disable-background-gc`.
