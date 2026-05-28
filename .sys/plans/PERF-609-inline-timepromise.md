---
id: PERF-609
slug: inline-timepromise
status: complete
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-609: Inline `timePromise` in CaptureLoop to eliminate Promise.resolve()

## Focus Area
DOM Rendering Pipeline - Promise allocations in `packages/renderer/src/core/CaptureLoop.ts` hot loop.

## Background Research
In `CaptureLoop.ts`, the multi-worker loop currently executes:
```typescript
            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            const timePromise = setTimeResult ? setTimeResult : Promise.resolve();
            await timePromise
                .then(() => strategy.capture(page, time))
                .then(
                    (buffer) => { ... },
                    (e) => { ... }
                );
```
Even though PERF-590 successfully eliminated the *unconditional* `Promise.resolve` wrapper around `timeDriver.setTime()`, it replaced it with a conditional `Promise.resolve()` when `setTimeResult` is falsy (which happens when `delta <= 0` in `CdpTimeDriver`). This means we are still allocating an empty Promise and scheduling an unnecessary microtask closure `() => strategy.capture(page, time)` whenever time does not advance (or when the driver is synchronous).

We can eliminate this overhead entirely by conditionally invoking `strategy.capture()` immediately if `setTimeResult` is void, or chaining it if `setTimeResult` is a Promise:
```typescript
            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            const capturePromise = setTimeResult
                ? setTimeResult.then(() => strategy.capture(page, time))
                : strategy.capture(page, time);

            const finalPromise = capturePromise instanceof Promise
                ? capturePromise
                : Promise.resolve(capturePromise);

            await finalPromise.then(
                (buffer) => {
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                },
                (e) => {
                    frameErrorRing[ringIndex] = e;
                    frameReadyRing[ringIndex] = 1;
                }
            );
```
By bypassing `Promise.resolve()` and the intermediate `.then()` closure when `setTimeResult` is falsy, we further reduce V8 garbage collection pressure and microtask overhead in the hot loop.

## Baseline
- **Current estimated render time**: ~1.466s
- **Bottleneck analysis**: Redundant Promise allocations and microtask ticks caused by `Promise.resolve()` and intermediate `.then()` in the `runWorker` hot loop.

## Implementation Spec

### Step 1: Inline `timePromise` in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker` (around line 185), replace the `timePromise` block with:
```typescript
            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            const captureResult = setTimeResult
                ? setTimeResult.then(() => strategy.capture(page, time))
                : strategy.capture(page, time);

            const finalPromise = captureResult instanceof Promise
                ? captureResult
                : Promise.resolve(captureResult);

            await finalPromise.then(
                (buffer) => {
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                },
                (e) => {
                    frameErrorRing[ringIndex] = e;
                    frameReadyRing[ringIndex] = 1;
                }
            );
```

**Why**: This completely eliminates the fallback `Promise.resolve()` and its attached `.then()` closure when `timeDriver.setTime()` executes synchronously or returns `void`.

## Correctness Check
Run `npx tsx packages/renderer/tests/run-all.ts` to verify correctness and ensure no unhandled promise rejections occur.
