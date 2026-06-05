---
id: PERF-684
slug: await-capture-separately
status: unclaimed
claimed_by: ""
created: 2024-06-05
completed: ""
result: ""
---

# PERF-684: Separate setTime Await from Strategy Capture

## Focus Area
The `CaptureLoop` fast path currently chains `.then()` or conditionally awaits `setTimeResult` and `strategy.capture`. We can simplify and potentially speed up this step by awaiting the time driver and the capture separately.

## Background Research
Currently the code reads:
```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
const buffer = setTimeResult
    ? await setTimeResult.then(() => strategy.capture(page, time))
    : await strategy.capture(page, time);
```

By changing it to:
```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
if (setTimeResult) {
    await setTimeResult;
}
const buffer = await strategy.capture(page, time);
```
We eliminate the `.then()` closure allocation which happens on every frame when `setTime` is async (like in DOM mode), removing an extra promise microtask boundary.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.18s
- **Bottleneck analysis**: CPU overhead in the tight inner loop of `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Update the Single Worker Fast Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the conditional promise chain with sequential `await`s in the single worker `for` loop.

```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
if (setTimeResult) {
    await setTimeResult;
}
const buffer = await strategy.capture(page, time);
```

### Step 2: Update the Actor Model Worker Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Perform the same replacement in `runWorker` for the `workerPromises` mapping.

```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
try {
    if (setTimeResult) {
        await setTimeResult;
    }
    const buffer = await strategy.capture(page, time);
    frameBufferRing[ringIndex] = buffer;
    frameReadyRing[ringIndex] = 1;
} catch (e) {
...
```

**Why**: Eliminates inline closures and `.then()` promise allocations in the hot loop.
**Risk**: Negligible risk. It's standard `async`/`await` pattern replacing an explicit `.then()`.

## Variations
None.

## Correctness Check
Run the DOM benchmark and ensure the output video `dom-benchmark.mp4` is playable and correct.
