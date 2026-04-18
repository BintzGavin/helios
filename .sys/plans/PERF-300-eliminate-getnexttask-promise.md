---
id: PERF-300
slug: eliminate-getnexttask-promise
status: unclaimed
claimed_by: ""
created: 2024-04-18
completed: ""
result: ""
---

# PERF-300: Eliminate getNextTask() Promise Allocation in CaptureLoop.ts

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `getNextTask()` and `runWorker()` loop logic.

## Background Research
Currently in `CaptureLoop.ts`, the inner loop of `runWorker` handles task management via `getNextTask()`. The current implementation of `getNextTask()` returns either a `number` synchronously when the pipeline has capacity, or a dynamically allocated `Promise<number>` when it is full. This forces the hot loop to check `typeof task === 'number'`, conditionally `await task`, and allocates a new Promise on each stall.

While PERF-291 attempted to optimize this by returning a synchronous number instead of always returning a Promise, the return type remains a union (`number | Promise<number>`), causing V8 to perform runtime type checks and limiting inline optimizations. More importantly, when the pipeline *is* full, `getNextTask()` still dynamically allocates a new `Promise` via `new Promise<number>((resolve) => { ... })`.

We can eliminate this dynamic Promise allocation entirely by utilizing a pre-bound blocking mechanism (similar to how `frameWaiterResolve` works for the main loop, or a lightweight custom semaphore structure) instead of allocating a fresh `Promise` every time a worker is blocked.

## Benchmark Configuration
- **Composition URL**: `tests/fixtures/benchmark.ts` (DOM benchmark)
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.832s
- **Bottleneck analysis**: Microtask yielding and dynamic Promise allocation inside the tight frame loop (`runWorker`) due to pipeline backpressure.

## Implementation Spec

### Step 1: Preallocate Worker Promises
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `waitingWorkerResolves: ((i: number) => void)[] = [];` and `const getNextTask = (): number | Promise<number> => { ... }`.
2. Instead of dynamic promise allocation, maintain a statically sized array of objects or arrays tracking worker blocked state, e.g., `const workerBlocks = new Array(poolLen).fill(null).map(() => ({ promise: null, resolve: null }));`.
3. In `runWorker`, change the loop to interact directly with the state block.
4. When `nextFrameToSubmit - nextFrameToWrite >= maxPipelineDepth`, the worker sets its resolve callback and blocks on `await workerBlocks[workerIndex].promise`.
5. In `checkState()`, iterate over the blocked workers and resolve their promises with the assigned frame index.

**Why**: Avoids creating a new `Promise` object dynamically on every single frame when the pipeline is at capacity. By reusing a structure or shifting the blocking logic to preallocated promises, we reduce GC pressure and inline checks.
**Risk**: If the worker blocking logic isn't perfectly synchronized with `checkState()`, workers might deadlock or process duplicate frames.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas rendering still works correctly (the loop logic applies equally).

## Correctness Check
Run the DOM benchmark `npx tsx tests/fixtures/benchmark.ts` to verify performance gains and ensure the output video is generated correctly.
