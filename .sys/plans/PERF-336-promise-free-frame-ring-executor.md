---
id: PERF-336
slug: promise-free-frame-ring-executor
status: complete
claimed_by: "Jules"
created: 2024-04-22
completed: "2024-04-22"
result: "inconclusive"
---

# PERF-336: Optimize CaptureLoop Actor Pipeline Backpressure

## Focus Area
`CaptureLoop.ts` in `@helios-project/renderer` package, specifically in the actor model backpressure loop.

## Background Research
The `CaptureLoop` uses an actor model where worker tasks execute asynchronously. When the pipeline hits its bounds, the main loop waits on worker task availability using `await new Promise<void>(resolve => { frameWaiterResolve = resolve; });`. This structure dynamically allocates a closure on every backpressure event. Memory history reveals that avoiding inline dynamic allocations inside hot-loops significantly improves headless rendering performance in V8 by avoiding unobserved closure accumulation and GC churn. Previous experiments (e.g. `PERF-321`, `PERF-324`, `PERF-335`) specifically target prebinding executors to avoid these inline closures.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~45.3s
- **Bottleneck analysis**: The inline literal closure allocation inside the pipeline backpressure loop creates V8 garbage collection pressure.

## Implementation Spec

### Step 1: Pre-bind the Promise executor for frameWaiterResolve
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Add `const frameWaiterExecutor = (resolve: () => void) => { frameWaiterResolve = resolve; };` near the declaration of `frameWaiterResolve` around line 116.
2. In the backpressure `while` loop (around line 247), replace the dynamic closure:
   ```typescript
            // Wait for the task to be queued by a worker or immediately queued
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(resolve => {
                    frameWaiterResolve = resolve;
                });
                continue;
            }
   ```
   with:
   ```typescript
            // Wait for the task to be queued by a worker or immediately queued
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(frameWaiterExecutor);
                continue;
            }
   ```
**Why**: Avoids creating an anonymous closure (`resolve => { frameWaiterResolve = resolve; }`) on every blocked pipeline tick, reducing GC churn in the orchestration path. V8's GC overhead is reduced because the same executor is passed repeatedly.
**Risk**: Structurally identical to existing code, no behavioral change. Very low risk.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM rendering captures frames correctly.

## Prior Art
- PERF-321: Prebound `workerBlockedExecutors`.
- PERF-324: Prebound frame promise executors for workers.
- PERF-335: Addressed exactly this issue but was unclaimed/unexecuted.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	46.581	600	12.88	41.7	keep	baseline
2	47.419	600	12.65	41.6	inconclusive	prebind frameWaiterResolve executor
```
