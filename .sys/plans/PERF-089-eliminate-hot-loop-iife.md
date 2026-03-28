---
id: PERF-089
slug: eliminate-hot-loop-iife
status: unclaimed
claimed_by: ""
created: 2026-03-29
completed: ""
result: ""
---

# PERF-089: Eliminate Function Allocation in the Frame Capture Hot Loop

## Focus Area
Frame capture loop in `packages/renderer/src/Renderer.ts`.

## Background Research
Currently, inside the `while (nextFrameToWrite < totalFrames)` hot loop in `Renderer.ts`, an anonymous async IIFE is allocated on every single frame iteration to process the worker's frame tasks:

```typescript
const framePromise = (async () => {
    try {
        await worker.activePromise;
    } catch (e) {
        // Ignore previous errors to allow chain to continue (or abort)
    }
    await worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    return worker.strategy.capture(worker.page, time);
})();
```

While previous experiments (e.g., PERF-077, PERF-088) demonstrated that `async` functions handle promise chains more efficiently than explicitly allocating `.then()` chains inside hot loops, generating a new anonymous closure function for every frame still creates unnecessary object allocations and Garbage Collection (GC) pressure in V8.

By hoisting the worker task into a named, statically defined async function placed completely outside the `while` loop, we can eliminate the anonymous function allocation per frame while still retaining the performance benefits of native `async/await` promise chaining.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture (`file:///app/output/example-build/examples/simple-animation/composition.html`)
- **Render Settings**: 150 frames, dom mode, 1280x720
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: Anonymous functions and closure allocations inside the hot `while` loop generate continuous micro-allocations in the V8 heap, increasing garbage collection stalls over a long frame capture run.

## Implementation Spec

### Step 1: Hoist Worker Frame Execution Logic
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Move the async worker execution logic entirely outside the inner loop definition. Above the `while (nextFrameToWrite < totalFrames)` loop, define a statically scoped function:

```typescript
const processWorkerFrame = async (worker: any, compositionTimeInSeconds: number, time: number) => {
    try {
        await worker.activePromise;
    } catch (e) {
        // Ignore previous errors to allow chain to continue (or abort)
    }
    await worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    return worker.strategy.capture(worker.page, time);
};
```

Then, inside the `while` loop, replace the async IIFE allocation:
```typescript
const framePromise = processWorkerFrame(worker, compositionTimeInSeconds, time);
```

**Why**: This ensures V8 allocates exactly one function object for the worker frame processing routine per render job, instead of dynamically re-allocating an anonymous function wrapper thousands of times.
**Risk**: Minimal. This simply modifies the lexical scope and allocation timing of an existing async execution routine.

## Canvas Smoke Test
Run the canvas benchmark or simple standalone rendering in `canvas` mode to ensure the change does not break default behavior since this code applies to the unified `Renderer.ts` structure.

## Correctness Check
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` multiple times to confirm the DOM capture does not hang and effectively captures frames without throwing Unhandled Promise Rejection errors.
