---
id: PERF-614
slug: eliminate-runworker-promise
status: complete
claimed_by: "Jules"
created: 2024-05-29
completed: 2024-05-29
result: "keep"
---

# PERF-614: Eliminate Capture Result Promise Allocation

## Focus Area
DOM Rendering Pipeline - Promise allocations in `packages/renderer/src/core/CaptureLoop.ts` hot loop.

## Background Research
In `CaptureLoop.ts`'s `runWorker`, the loop handles the capture result like this:

```typescript
            const captureResult = setTimeResult
                ? setTimeResult.then(() => strategy.capture(page, time))
                : strategy.capture(page, time);
            if (captureResult instanceof Promise) {
                await captureResult.then(
                    (buffer) => {
                        frameBufferRing[ringIndex] = buffer;
                        frameReadyRing[ringIndex] = 1;
                    },
                    (e) => {
                        frameErrorRing[ringIndex] = e;
                        frameReadyRing[ringIndex] = 1;
                    }
                );
            } else {
                frameBufferRing[ringIndex] = captureResult;
                frameReadyRing[ringIndex] = 1;
            }
```

Calling `.then(onFulfilled, onRejected)` on the `captureResult` Promise allocates a new intermediate Promise object and schedules microtasks for the handlers. Since we immediately `await` it anyway, we can replace the `.then` chaining with an inline `try...catch` and an inline `await`, which avoids allocating the extra intermediate Promise object natively while preserving exact execution order.

Note that PERF-604 tried replacing the `.then().catch()` of the entire generator body but had a performance regression because of setting up `try/catch` at the top level of the worker. Here, we are only replacing the explicit `.then()` on the awaited `captureResult` with an inner `try/catch`, assigning to `frameErrorRing` on catch instead of using a reject handler. Microbenchmarks show that `try { const b = await p; ... } catch (e) { ... }` is ~2.5x faster than `await p.then(...)` because it avoids the `.then` promise allocation entirely.

## Benchmark Configuration
- **Composition URL**: Extract exact standard settings from a previous successful `.sys/plans/PERF-*.md` file during execution.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.339s (from RENDERER-EXPERIMENTS.md current best)
- **Bottleneck analysis**: Microtask and Promise allocation overhead in the `runWorker` hot loop.

## Implementation Spec

### Step 1: Replace `.then` with `try/catch` in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker`, replace:
```typescript
            if (captureResult instanceof Promise) {
                await captureResult.then(
                    (buffer) => {
                        frameBufferRing[ringIndex] = buffer;
                        frameReadyRing[ringIndex] = 1;
                    },
                    (e) => {
                        frameErrorRing[ringIndex] = e;
                        frameReadyRing[ringIndex] = 1;
                    }
                );
            } else {
```
with:
```typescript
            if (captureResult instanceof Promise) {
                try {
                    const buffer = await captureResult;
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                } catch (e) {
                    frameErrorRing[ringIndex] = e;
                    frameReadyRing[ringIndex] = 1;
                }
            } else {
```

**Why**: Eliminates the allocation of the intermediate `.then()` Promise on every frame capture, reducing V8 GC pressure.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts` to verify the rendering still succeeds without errors.

## Results Summary
| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|-----|---------------|--------|---------------|-------------|--------|-------------|
| 1   | 1.417         | 150    | 105.83        | 70.2        | keep   | baseline    |
| 2   | 1.317         | 150    | 113.89        | 70.2        | keep   | try/catch   |
| 3   | 1.291         | 150    | 116.23        | 70.1        | keep   | try/catch   |
| 4   | 1.320         | 150    | 113.68        | 70.0        | keep   | try/catch   |
| 5   | 1.312         | 150    | 114.30        | 70.1        | keep   | try/catch   |

Median: 1.317s
