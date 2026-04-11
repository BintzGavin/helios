---
id: PERF-251
slug: remove-closure
status: unclaimed
claimed_by: ""
created: "2026-04-11"
completed: ""
result: ""
---

# PERF-251: Pre-bind Closure in CaptureLoop Worker Dispatch

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop` uses a `.then()` closure to schedule the next frame's capture:
```typescript
            const framePromise = worker.activePromise
                .catch(noopCatch)
                .then(() => {
                    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                    return worker.strategy.capture(worker.page, time);
                });
```
This anonymous closure `() => { ... }` is allocated on every frame (e.g. 150 times per 5s video), which causes V8 garbage collection overhead in memory-constrained environments. Similar anonymous closure allocations have been optimized in other hot loops (e.g. PERF-245 in CdpTimeDriver). By creating a pre-allocated bound method or static context, we can avoid this per-frame allocation.
Wait, earlier we tried `Pre-allocated execution context ring buffer inside CaptureLoop hot loop (PERF-241)`.
Let's check the journal.
"Creating context objects and binding methods up front degraded performance significantly (~49.6s baseline to ~50.9s). The overhead of calling .bind() and using closure functions wrapped in objects outweighed the performance cost of anonymous closure allocation in the .then() callback."

Let me check the `CaptureLoop.ts` file again.
