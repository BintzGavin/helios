---
id: PERF-652
slug: flatten-capture-await
status: unclaimed
claimed_by: ""
created: 2024-06-02
completed: ""
result: ""
---

# PERF-652: Bypass DOM Strategy Async Generator and Promise Return

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop.ts` `runWorker` method uses a ternary expression inside an `await`:
```typescript
const buffer = setTimeResult
    ? await setTimeResult.then(() => strategy.capture(page, time))
    : await strategy.capture(page, time);
```
This creates a closure `() => strategy.capture(page, time)` on every frame that requires syncing media and also forces V8 to wrap the ternary output in a polymorphic microtask structure. By replacing the `.then()` chain and ternary with sequential native `await` statements, we can completely eliminate the closure allocation and microtask wrapping overhead, leveraging V8's highly optimized `async/await` sequence generator directly in the hot loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/output/example-build/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.261s (Current best after PERF-650)
- **Bottleneck analysis**: Microtask and Promise closure allocation overhead inside the `runWorker` hot loop.

## Implementation Spec

### Step 1: Flatten `setTimeResult` await chain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function, modify the `try/catch` block to use sequential `await` instead of a `.then()` chained ternary:
```typescript
<<<<<<< SEARCH
            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            try {
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
=======
            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            try {
                if (setTimeResult) {
                    await setTimeResult;
                }
                const buffer = await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
>>>>>>> REPLACE
```
**Why**: This completely eliminates the `() => strategy.capture(page, time)` closure allocation and the `.then()` chain microtask overhead on every single frame.
**Risk**: Very low. It strictly simplifies the execution path.

## Variations
None.

## Correctness Check
Run the DOM render benchmark `npx tsx packages/renderer/scripts/benchmark-perf.ts` and verify output integrity. Run `npx tsx packages/renderer/tests/run-all.ts` to ensure no regressions.
