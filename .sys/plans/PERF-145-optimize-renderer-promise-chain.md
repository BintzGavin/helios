---
id: PERF-145
slug: optimize-renderer-promise-chain
status: unclaimed
claimed_by: ""
created: 2024-04-02
completed: ""
result: ""
---
# PERF-145: Optimize Renderer Promise Chain

## Focus Area
The `Renderer.ts` frame capture hot loop, specifically the promise chain that links `worker.timeDriver.setTime` and `worker.strategy.capture`.

## Background Research
Currently in `Renderer.ts` within the `captureLoop`:
```typescript
const framePromise = worker.activePromise.then(() => {
    const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    const capturePromise = worker.strategy.capture(worker.page, time);
    return setTimePromise.then(() => capturePromise);
});
```
This architecture correctly invokes `setTime` and `capture` concurrently on the Node.js side. Because Playwright sends CDP commands sequentially over the same connection, the browser is guaranteed to evaluate `setTime` before capturing the frame.

However, returning `setTimePromise.then(() => capturePromise)` allocates a redundant closure and intermediate Promise object for every single frame in the loop, adding to V8 Garbage Collection pressure and micro-stall overhead.

Since CDP executes sequentially, the resolution of `capturePromise` natively implies that the prior `setTime` evaluation has also finished. By explicitly handling any errors from `setTimePromise` with a `.catch()` and returning `capturePromise` directly, we can eliminate the `.then()` chain overhead while preserving the exact same concurrent CDP emission and sequential processing semantics.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition (`output/example-build/examples/simple-animation/composition.html`)
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s
- **Bottleneck analysis**: Micro-stalls from V8 promise closure allocation and garbage collection within the frame capture loop.

## Implementation Spec

### Step 1: Optimize Promise Chain in Renderer.ts
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Replace the `.then` closure return inside the `captureLoop` with an explicit catch and direct return:
<<<<<<< SEARCH
                  const framePromise = worker.activePromise.then(() => {
                      const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
                      const capturePromise = worker.strategy.capture(worker.page, time);
                      return setTimePromise.then(() => capturePromise);
                  });
=======
                  const framePromise = worker.activePromise.then(() => {
                      worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
                      return worker.strategy.capture(worker.page, time);
                  });
>>>>>>> REPLACE
**Why**: This avoids allocating a new `.then()` Promise and closure (`() => capturePromise`) for every single frame. It relies on the implicit CDP sequence queueing mechanism where `capturePromise` will organically resolve *after* `setTimePromise` finishes. The `noopCatch` ensures we do not leak unhandled promise rejections if `setTime` fails before `capture` is resolved.
**Risk**: If Playwright or the CDP session changes to a multiplexed transport where commands don't execute sequentially, `capture` might race `setTime`. However, this assumption is already heavily relied upon throughout the codebase (and validated in PERF-114).

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-seek-driver-determinism.ts` to ensure frame rendering remains deterministic and synchronous.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure basic canvas rendering isn't broken.
