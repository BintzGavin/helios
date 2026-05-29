---
id: PERF-620
slug: inline-capture-worker
status: unclaimed
claimed_by: ""
created: 2024-05-29
completed: ""
result: ""
---

# PERF-620: Flatten and Inline worker logic in CaptureLoop

## Focus Area
`CaptureLoop.ts` (`runWorker` function)

## Background Research
The `runWorker` function in `CaptureLoop.ts` handles the execution of frame captures for each worker in the pool. It relies heavily on dynamically evaluating `timeDriver.setTime()` and `strategy.capture()`, checking for `Promise` returns, and awaiting them.

Because `DomStrategy.capture` is already an `async` method (meaning it always returns a Promise) and `CdpTimeDriver.setTime` is generally asynchronous (returns a Promise), we might benefit from converting `runWorker`'s execution path to a pure `async` state machine without `instanceof Promise` checks for `captureResult`, bypassing any potential polymorphic overhead in V8 and avoiding branch mispredictions in the hot loop.

While PERF-616 explored splitting synchronous and asynchronous branches entirely at the worker level and failed (as all capture strategies return promises), simply awaiting the capture result uniformly is different and was previously partially investigated in PERF-615 but not combined with inlining `setTimeResult`.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/output/example-build/composition.html`)
- **Render Settings**: Standard microVM constraints.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.315s (after reinstalling)
- **Bottleneck analysis**: Microtask and branching overhead in the `runWorker` hot loop.

## Implementation Spec

### Step 1: Flatten and Inline Promise logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker`, inline the execution to always await both `setTime()` and `capture()`.

From:
```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
const captureResult = setTimeResult
    ? setTimeResult.then(() => strategy.capture(page, time))
    : strategy.capture(page, time);
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
    frameBufferRing[ringIndex] = captureResult;
    frameReadyRing[ringIndex] = 1;
}
```

To:
```typescript
try {
    const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
    if (setTimeResult) {
        await setTimeResult;
    }
    const buffer = await strategy.capture(page, time);
    frameBufferRing[ringIndex] = buffer;
    frameReadyRing[ringIndex] = 1;
} catch (e) {
    frameErrorRing[ringIndex] = e;
    frameReadyRing[ringIndex] = 1;
}
```
**Why**: Avoids `.then()` closure allocations entirely, replacing them with a flat `try/catch` using native `await`. Eliminates branching overhead for `captureResult` since we know it's always a Promise in the actual implementations.
**Risk**: If `strategy.capture` ever returned a synchronous value, `await`ing it incurs a very slight microtask tick penalty, but since `DomStrategy` is `async` this is a non-issue.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance and verify correct output.

## Prior Art
- **PERF-615**: Planned but not fully implemented this exact unified `try/catch` and `await` approach.
