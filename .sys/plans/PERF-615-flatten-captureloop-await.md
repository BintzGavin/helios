---
id: PERF-615
slug: flatten-captureloop-await
status: complete
claimed_by: "executor-session"
created: 2024-05-29
completed: ""
result: ""
---

# PERF-615: Flatten CaptureLoop Promise Chain into Native Await

## Focus Area
`CaptureLoop.ts` (`runWorker` function): The hot loop that processes frames. Specifically, optimizing the `setTimeResult` and `captureResult` chaining.

## Background Research
Currently in `CaptureLoop.ts`, the hot loop uses a mix of synchronous checks and promise chains to execute time driver advancement and frame capture.
```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
const captureResult = setTimeResult
    ? setTimeResult.then(() => strategy.capture(page, time))
    : strategy.capture(page, time);
if (captureResult instanceof Promise) {
    try {
        const buffer = await captureResult;
        // ...
    } // ...
}
```
Recent performance experiments like `PERF-511` demonstrated that in the DOM strategy hot loop, replacing chained `.then()` closures with sequential `await`s inside a `try/catch` significantly reduces Promise allocation overhead and closure creation, improving performance. V8's native async/await state machine is often faster than dynamic promise chaining in highly predictable hot loops.

By flattening this into a simple sequential await block, we eliminate the need for `.then(() => ...)` closure allocation on frames where `setTimeResult` is a Promise, potentially avoiding minor GC pauses and V8 microtask scheduling overhead.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/output/example-build/composition.html`)
- **Render Settings**: Same as baseline (standard microVM constraints).
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s (from PERF-614)
- **Bottleneck analysis**: The `runWorker` hot loop is executed per frame across multiple workers. Minimizing object/closure allocations in this tight loop is the primary optimization frontier since Playwright IPC is heavily bottlenecked.

## Implementation Spec

### Step 1: Flatten Await Chain in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function, replace the `captureResult` assignment and subsequent `instanceof Promise` check with a sequential `await` flow wrapped in a `try/catch`.

Specifically, change lines ~185-199 from:
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
    if (setTimeResult instanceof Promise) {
        await setTimeResult;
    }

    const captureResult = strategy.capture(page, time);
    const buffer = captureResult instanceof Promise ? await captureResult : captureResult;

    frameBufferRing[ringIndex] = buffer;
    frameReadyRing[ringIndex] = 1;
} catch (e) {
    frameErrorRing[ringIndex] = e;
    frameReadyRing[ringIndex] = 1;
}
```

**Why**: This change eliminates the closure `() => strategy.capture(page, time)` created when `setTimeResult` is a promise, and leverages V8's highly optimized `async/await` state machine instead of manually chaining promises. It unifies the error handling and success paths, making the JIT compiler's job easier.

**Risk**: Negligible. The functional outcome is identical. If V8 handles `.then` chains faster than sequential `await`s in this specific context (as seen in some past experiments), performance might regress slightly.

## Variations
None needed. The implementation is straightforward.

## Canvas Smoke Test
Run a basic canvas render to ensure `CanvasStrategy` is not negatively impacted by the change in `CaptureLoop.ts`.

## Correctness Check
Run the DOM benchmark and inspect the output video to ensure frames are still captured correctly and in the correct order.

## Prior Art
- **PERF-511**: Inlined Begin Frame Await (`.then` to `await`), which significantly improved performance.
- **PERF-614**: Eliminated Capture Result Promise Allocation, moving to inline `try/catch`. This experiment naturally extends PERF-614 upstream to `setTimeResult`.
## Results Summary
- **Best render time**: 2.392s (vs baseline 2.478s)
- **Improvement**: ~3.5% (Inconclusive/Noise)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-615]
