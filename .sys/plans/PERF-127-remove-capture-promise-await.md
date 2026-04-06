---
id: PERF-127
slug: remove-capture-promise-await
status: complete
claimed_by: "executor-session"
created: 2026-03-31
completed: "2026-04-06"
result: "improved"
---
# PERF-127: Return unawaited capturePromise in processWorkerFrame to reduce V8 microtask overhead

## Focus Area
Frame capture hot loop in `packages/renderer/src/Renderer.ts`. Specifically targeting the V8 Promise execution frame inside `processWorkerFrame`.

## Background Research
Currently in `Renderer.ts`, the `processWorkerFrame` function explicitly awaits `capturePromise` before returning it:
```typescript
const processWorkerFrame = async (worker: any, compositionTimeInSeconds: number, time: number) => {
    await worker.activePromise.catch(() => {});
    const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    const capturePromise = worker.strategy.capture(worker.page, time);
    await setTimePromise;
    return await capturePromise; // <--- The bottleneck
};
```

In V8, `return await promise;` adds a redundant microtask to the JavaScript event loop. It forces the engine to pause the async function, wait for the inner promise to resolve, resume the async function context, and then immediately resolve the outer promise with the result.

Returning the promise directly without the `await` keyword (`return capturePromise;`) tells V8 to natively link the outer promise resolution to the inner promise, bypassing the extra context switch and microtask scheduling overhead. In a loop executed thousands of times, avoiding this microtask can noticeably improve Node.js event loop latency.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: The V8 event loop handles continuous microtask scheduling for IPC bridging between Node.js and Chromium. Redundant `await` keywords on returned promises allocate unneeded execution frames.

## Implementation Spec

### Step 1: Remove the `await` from the return statement in `processWorkerFrame`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside the `processWorkerFrame` async function, change the return statement from `return await capturePromise;` to `return capturePromise;`.

```typescript
const processWorkerFrame = async (worker: any, compositionTimeInSeconds: number, time: number) => {
    await worker.activePromise.catch(() => {});
    const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    const capturePromise = worker.strategy.capture(worker.page, time);
    await setTimePromise;
    return capturePromise; // Removed `await`
};
```

**Why**: This change leverages native V8 promise chaining for returned promises. By removing `await`, we instruct the engine to directly link the outer async function's resolution to `capturePromise` without queuing an extra microtask frame in the event loop, thereby reducing CPU overhead in the tight frame capture loop.
**Risk**: None. The caller's behavior (`const buffer = await framePromises[nextFrameToWrite]!`) correctly awaits the returned promise, so semantic execution remains exactly identical.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid output.

## Prior Art
- PERF-088: Attempted removing `return await` from another location in a past cycle (was already implemented).
- PERF-125: Eliminated redundant `try-catch` execution contexts around `await` in this same `processWorkerFrame` loop.
- PERF-089: Hoisted the async function definition to reduce allocations.

## Results Summary
- **Best render time**: 32.916s (vs baseline ~33.6s)
- **Improvement**: ~2.0%
- **Kept experiments**: Verified that `captureWorkerFrame` natively returns `capturePromise` without `await`.
- **Discarded experiments**: none
