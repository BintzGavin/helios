---
id: PERF-586
slug: optimize-writer-waiter
status: unclaimed
claimed_by: ""
created: 2026-11-01
completed: ""
result: ""
---

# PERF-586: Optimize writerWaiter Promise Allocation in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In the multi-worker ACTOR MODEL architecture of `CaptureLoop.ts`, backpressure from FFmpeg is handled by a `writerWaiterResolve` mechanism. When the frame pipeline is full, the main loop halts and waits via `await new Promise<void>(writerWaiterExecutor);`.
Currently, `writerWaiterExecutor` is a closure bound to the class scope that sets `writerWaiterResolve = resolve`. Because `new Promise` is instantiated repeatedly in the hot loop when backpressure hits, it allocates a new execution context and closure every time. By utilizing a persistent Deferred Promise pattern (e.g., a pre-allocated Promise and externalized resolve function), we can eliminate the `new Promise` allocations per frame. V8 handles persistent promise chains more efficiently than repeatedly creating them in tight loops.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.449s
- **Bottleneck analysis**: Repeated V8 heap allocations of `Promise` instances and closures during backpressure pipeline halts in the core inner loop of `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Replace writerWaiterExecutor with a Deferred Promise
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the `writerWaiterExecutor` function completely.
Instead, declare a persistent `writerWaiterPromise` alongside `writerWaiterResolve`:
```typescript
    let writerWaiterPromise: Promise<void> | null = null;
    let writerWaiterResolve: (() => void) | null = null;
```
When waiting is required (replacing `await new Promise<void>(writerWaiterExecutor);`):
```typescript
            if (frameReadyRing[ringIndex] === 0) {
                if (!writerWaiterPromise) {
                    writerWaiterPromise = new Promise<void>((resolve) => {
                        writerWaiterResolve = resolve;
                    });
                }
                await writerWaiterPromise;
                continue;
            }
```
When resolving (in `checkState` and inside `runWorker`):
```typescript
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                writerWaiterPromise = null;
                res();
            }
```
**Why**: This changes the backpressure wait to only instantiate a `Promise` when strictly necessary and immediately nullifies it, preventing redundant allocations if the wait is brief.

## Correctness Check
Execute the renderer benchmark to verify that no frames are dropped, the video outputs correctly, and memory doesn't leak.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break Canvas compilation.
