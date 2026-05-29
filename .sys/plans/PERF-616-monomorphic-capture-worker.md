---
id: PERF-616
slug: monomorphic-capture-worker
status: unclaimed
claimed_by: ""
created: 2024-05-29
completed: ""
result: ""
---

# PERF-616: Monomorphic Capture Worker Paths

## Focus Area
DOM Rendering Pipeline - Dynamic type checking and branching in `CaptureLoop.ts` (`runWorker` function).

## Background Research
Currently, the `runWorker` function inside `CaptureLoop.ts` handles the execution of frame capturing and is designed to accommodate both synchronous and asynchronous strategies. The hot loop executes the following code:
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
This requires V8 to evaluate the ternary operator and the `instanceof Promise` check on every single frame. Dynamic type checking inside a hot loop is generally slower than executing a monomorphic code path where the runtime types are statically known, as it impairs the JIT compiler's ability to deeply inline methods.

Since the DOM strategy always relies on the asynchronous `CdpTimeDriver` and `DomStrategy.capture` returns a Promise, we can avoid the `instanceof Promise` dynamic checks and the ternary operators entirely by using a specialized `runAsyncWorker` function for DOM mode (or whenever the driver/strategy requires async execution) and a specialized `runSyncWorker` for canvas mode.

## Benchmark Configuration
- **Composition URL**: Extract exact standard settings from a previous successful `.sys/plans/PERF-*.md` file during execution.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s (from current best baseline in `docs/status/RENDERER-EXPERIMENTS.md` or earlier plan results).
- **Bottleneck analysis**: The `runWorker` hot loop spends unnecessary cycles evaluating the type of `captureResult` and resolving the ternary branch on every iteration, leading to megamorphic or unoptimized execution paths.

## Implementation Spec

### Step 1: Create Monomorphic Worker Loops in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Split the single `runWorker` function inside the `run()` method into two distinct functions: `runAsyncWorker` and `runSyncWorker`.
2. In `runAsyncWorker`, assume both `timeDriver.setTime` and `strategy.capture` are asynchronous (return Promises). Structure the code linearly using `await`:
```typescript
try {
    await timeDriver.setTime(page, compositionTimeInSeconds);
    const buffer = await strategy.capture(page, time);
    frameBufferRing[ringIndex] = buffer;
    frameReadyRing[ringIndex] = 1;
} catch (e) {
    frameErrorRing[ringIndex] = e;
    frameReadyRing[ringIndex] = 1;
}
```
3. In `runSyncWorker`, assume both functions execute synchronously and eliminate all `await` or `instanceof Promise` checks entirely.
4. Modify the `workerPromises` mapping logic to dynamically select the correct worker function based on the strategy type (or a configuration flag indicating whether the strategy is async). For example:
```typescript
const isAsyncStrategy = this.options.mode === 'dom';
const workerPromises = this.pool.map((w, i) => isAsyncStrategy ? runAsyncWorker(w, i) : runSyncWorker(w, i));
```

**Why**: By explicitly defining parallel synchronous and asynchronous loops, we enable V8 to generate highly optimized, monomorphic JIT code tailored exactly to the active execution mode without runtime branching or type inspection overhead.

**Risk**: If the `CanvasStrategy` inadvertently returns Promises, `runSyncWorker` would improperly place raw Promise objects into the buffer ring. Ensure `isAsyncStrategy` correctly identifies when async handling is necessary.

## Variations
None.

## Canvas Smoke Test
Run a Canvas render to ensure `runSyncWorker` functions correctly without regressions for the existing Canvas pipeline.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts` to ensure rendering completes sequentially and deterministically without runtime logic errors.

## Prior Art
- **PERF-614 / PERF-615**: Eliminated intermediate `.then()` Promise allocations via flat inline `try/catch`. This plan builds on the notion of stripping down the hot loop code but addresses the remaining dynamic runtime polymorphism logic.