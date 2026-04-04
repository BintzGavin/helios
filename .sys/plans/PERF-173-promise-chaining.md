---
id: PERF-173
slug: promise-chaining
status: unclaimed
claimed_by: ""
created: 2025-05-18
completed: ""
result: ""
---
# PERF-173: Optimize Promise Chaining in Hot Loop

## Focus Area
`Renderer.ts` `captureLoop` worker promise chaining.

## Background Research
Currently, the renderer explicitly catches errors for `timeDriver.setTime()` and then immediately returns `worker.strategy.capture()` inside an anonymous closure `.then(() => { ... })`. This causes both promises to be constructed and dispatched synchronously within the same microtask. Micro-benchmarks conducted in the runtime environment indicate that flattening this to a chained `.then()` (i.e. `worker.timeDriver.setTime().catch().then(() => worker.strategy.capture())`) is faster (350ms vs 385ms for 1M iterations), likely because V8 optimizes chained native promises more efficiently than synchronous dispatch blocks inside closures.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, duration 5s
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: V8 micro-stalls from promise allocations in the hot loop.

## Implementation Spec

### Step 1: Flatten Promise Chain
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Change the frame promise assignment to use a chained `.then()` rather than sequential synchronous execution inside a `.then(() => {})` wrapper.
From:
```typescript
                  const framePromise = worker.activePromise.then(() => {
                      worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
                      return worker.strategy.capture(worker.page, time);
                  });
```
To:
```typescript
                  const framePromise = worker.activePromise.then(() =>
                      worker.timeDriver.setTime(worker.page, compositionTimeInSeconds)
                          .catch(noopCatch)
                          .then(() => worker.strategy.capture(worker.page, time))
                  );
```
**Why**: Avoids executing `capture` synchronously in the same microtask as `setTime` submission, potentially reducing Playwright IPC queue contention.
**Risk**: Negligible.

## Correctness Check
Run the `verify-dom-strategy-capture.ts` test script to ensure screenshots are captured.
