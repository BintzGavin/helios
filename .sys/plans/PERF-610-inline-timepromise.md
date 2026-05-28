---
id: PERF-610
slug: inline-timepromise-retry
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-610: Inline `timePromise` in CaptureLoop to eliminate Promise.resolve() Part 2

## Focus Area
DOM Rendering Pipeline - Promise allocations in `packages/renderer/src/core/CaptureLoop.ts` hot loop.

## Background Research
In `CaptureLoop.ts`, the multi-worker loop currently executes:
```typescript
            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            const captureResult = setTimeResult
                ? setTimeResult.then(() => strategy.capture(page, time))
                : strategy.capture(page, time);

            const finalPromise = captureResult instanceof Promise
                ? captureResult
                : Promise.resolve(captureResult);

            await finalPromise.then(
                (buffer) => { ... },
                (e) => { ... }
            );
```
Wait, this is already what it's doing from PERF-609. The PERF-609 experiment successfully eliminated the `Promise.resolve` wrapper around `timeDriver.setTime()` and improved the median render time. Let's see if we can do better by avoiding `Promise.resolve(captureResult)` entirely, and instead of `await finalPromise.then(...)`, we await the result directly or handle the synchronous value.

If `captureResult` is not a promise, we can just assign the values synchronously instead of wrapping it in `Promise.resolve` and `.then()`.

```typescript
            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
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

This bypasses creating the `finalPromise` entirely, along with its associated microtask closure when `captureResult` is synchronous (though `DomStrategy.capture` currently always returns a Promise because of CDP). Wait, `strategy.capture()` returns `Promise<Buffer | string> | Buffer | string`. For Canvas it might return `Buffer` synchronously in some cases. However, if it returns a Promise, we still save the `instanceof Promise` and `Promise.resolve` branch resolution at runtime.

Let's test if this simple branching saves any overhead.

## Baseline
- **Current estimated render time**: ~1.462s
- **Bottleneck analysis**: Overhead from `Promise.resolve()` for `finalPromise` and its `.then()` closure.

## Implementation Spec

### Step 1: Branch `captureResult` explicitly
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker`, replace:
```typescript
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
with:
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
                frameBufferRing[ringIndex] = captureResult;
                frameReadyRing[ringIndex] = 1;
            }
```

## Correctness Check
Run `npx tsx packages/renderer/tests/run-all.ts` to verify correctness and ensure no unhandled promise rejections occur.
