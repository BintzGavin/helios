---
id: PERF-291
slug: eliminate-getnexttask-promise
status: complete
claimed_by: "jules"
created: 2024-05-15
completed: "2024-05-16"
result: "inconclusive"
---

# PERF-291: Eliminate Dynamic Promise Allocation in CaptureLoop.ts getNextTask

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - The frame assignment mechanism (`getNextTask` and `runWorker`).

## Background Research
The `CaptureLoop` orchestrates frame capture by maintaining a pool of workers that continuously pull frame indices to render. They do this by calling `const i = await getNextTask()`.
Currently, `getNextTask` is implemented as an `async` function that always allocates a `new Promise<number>((resolve) => { ... })`. Even when the internal pipeline has capacity (which is true most of the time since it buffers ahead of FFmpeg writes), it constructs this Promise and resolves it immediately.
This forces V8 to allocate a Promise object, a closure for the executor, and forces the worker to yield to the microtask queue (`await`) on every single frame iteration. By changing `getNextTask` to synchronously return `number` when possible, and only returning a `Promise<number>` when it actually needs to block (when workers exceed the pipeline depth buffer), we eliminate one object allocation, one closure allocation, and one microtask stall per frame per worker.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (from `scripts/benchmark-test.js`)
- **Render Settings**: 1280x720, 30 FPS, 3s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.040s
- **Bottleneck analysis**: The Playwright workers are bottlenecked by CPU constraints. Eliminating Promise allocations and microtask jumps keeps execution hot and strictly synchronous when pulling tasks, reducing V8 GC and scheduling overhead.

## Implementation Spec

### Step 1: Refactor `getNextTask` to return `number | Promise<number>`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change `getNextTask` from an `async` function returning `Promise<number>` to a synchronous function returning `number | Promise<number>`.
```typescript
<<<<<<< SEARCH
    const getNextTask = async (): Promise<number> => {
        return new Promise<number>((resolve) => {
            if (aborted || nextFrameToSubmit >= this.totalFrames) {
                resolve(-1);
                return;
            }

            if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
                const i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                const promise = new Promise<Buffer | string>((res, rej) => {
                    contextRing[ringIndex].resolve = res;
                    contextRing[ringIndex].reject = rej;
                });
                promise.catch(noopCatch); // Prevent unhandled rejections
                framePromises[ringIndex] = promise;

                if (frameWaiterResolve) {
                    const fRes = frameWaiterResolve;
                    frameWaiterResolve = null;
                    fRes();
                }

                resolve(i);
            } else {
                waitingWorkerResolves.push(resolve);
            }
        });
    };
=======
    const getNextTask = (): number | Promise<number> => {
        if (aborted || nextFrameToSubmit >= this.totalFrames) {
            return -1;
        }

        if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
            const i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;

            const promise = new Promise<Buffer | string>((res, rej) => {
                contextRing[ringIndex].resolve = res;
                contextRing[ringIndex].reject = rej;
            });
            promise.catch(noopCatch); // Prevent unhandled rejections
            framePromises[ringIndex] = promise;

            if (frameWaiterResolve) {
                const fRes = frameWaiterResolve;
                frameWaiterResolve = null;
                fRes();
            }

            return i;
        } else {
            return new Promise<number>((resolve) => {
                waitingWorkerResolves.push(resolve);
            });
        }
    };
>>>>>>> REPLACE
```
**Why**: Avoids `new Promise` wrapper allocation when capacity is available.

### Step 2: Refactor `runWorker` to handle synchronous returns
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Update the worker loop to conditionally await.
```typescript
<<<<<<< SEARCH
    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const formatResponse = strategy.formatResponse;

        while (!aborted) {
            const i = await getNextTask();
            if (i === -1) break;
=======
    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const formatResponse = strategy.formatResponse;

        while (!aborted) {
            const task = getNextTask();
            const i = typeof task === 'number' ? task : await task;
            if (i === -1) break;
>>>>>>> REPLACE
```
**Why**: This skips the `await` keyword altogether when `getNextTask` returns a `number`, completely avoiding the microtask queue yield.

## Variations
No variations needed. This is a direct inline structural change.

## Canvas Smoke Test
Run the Canvas example or verify with standard diagnostics to ensure `CaptureLoop` continues to operate correctly.

## Correctness Check
Run `cd packages/renderer && npx tsx scripts/benchmark-test.js` to ensure the final output `.mp4` compiles and completes cleanly, validating the pipeline actor model is perfectly preserved.
