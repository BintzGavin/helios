---
id: PERF-749
slug: hoist-try-catch-in-runworker
status: unclaimed
claimed_by: ""
created: 2025-02-23
completed: ""
result: ""
---

# PERF-749: Hoist `try/catch` Outside the Concurrent Worker Hot Loop

## Focus Area
The `runWorker` asynchronous loop in `CaptureLoop.ts` (`poolLen > 1` branch). Specifically, moving the `try/catch` block that wraps the per-frame extraction out of the `while (!aborted)` loop.

## Background Research
Currently, the multi-worker actor model loop in `CaptureLoop.ts` evaluates a `try/catch` block inside the `while (!aborted)` loop on every single frame:
```typescript
        while (!aborted) {
            // ...
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                // ...
            } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
            }
            writerWaiterPromise.resolve();
        }
```
V8's TurboFan compiler has improved significantly, but having a `try/catch` block inside a tight, rapidly executing async `while` loop still adds AST complexity and exception handler mapping overhead for the JIT compiler per iteration. If an error occurs during frame rendering, it is considered a fatal rendering error, and we immediately abort the entire job (`aborted = true`, `checkState()`). There is no frame recovery logic. Thus, we can safely hoist the `try/catch` block completely outside the `while` loop, allowing V8 to optimize the inner loop cleanly without setting up local exception boundaries on every frame.

In the fast-path single worker mode (`poolLen === 1`), the `try/catch` is already hoisted outside the `for` loop, proving the architectural validity of this approach.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 300 frames, libx264
- **Mode**: `dom` (with multi-worker concurrency, e.g., concurrency > 1, though it also runs on concurrency 1 to ensure standard execution is stable).
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~13.005s (from PERF-748 multi-worker benchmark)
- **Bottleneck analysis**: JIT compilation complexity and AST traversal overhead caused by repeated `try/catch` boundaries inside an async hot loop.

## Implementation Spec

### Step 1: Hoist `try/catch` outside the `while` loop in `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the `runWorker` function inside the `run()` multi-worker path. Change the structure from:
```typescript
    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const hasProcessFn = !!strategy.processCaptureResult;

        while (!aborted) {
            // ... logic
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                const buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
            }
            writerWaiterPromise.resolve();
        }
    };
```
To:
```typescript
    const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const hasProcessFn = !!strategy.processCaptureResult;

        try {
            while (!aborted) {
                let i: number;
                if (aborted || nextFrameToSubmit >= totalFrames) {
                    i = -1;
                } else if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
                    i = nextFrameToSubmit++;
                    const ringIndex = i & ringMask;

                    frameReadyRing[ringIndex] = 0;
                    frameBufferRing[ringIndex] = null;
                } else {
                    freeWorkers[freeWorkersHead++] = workerIndex;
                    checkState();
                    i = (await workerThenables[workerIndex] as any) as number;
                }

                if (i === -1) break;

                const time = i * timeStep;
                const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                const ringIndex = i & ringMask;

                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                const buffer = hasProcessFn ? strategy.processCaptureResult!(rawResult) : rawResult;
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;

                writerWaiterPromise.resolve();
            }
        } catch (e) {
            fatalError = e;
            aborted = true;
            checkState();
            writerWaiterPromise.resolve();
        }
    };
```
**Why**: Hoisting the `try/catch` out of the `while` loop removes exception handling boundary tracking from the hot iteration, mirroring the single-worker fast path. If a rejection occurs, it correctly jumps out of the loop and handles the fatal error, while also unblocking the writer.
**Risk**: If any non-fatal errors were previously caught and ignored (they weren't, since `aborted` was immediately set to `true`), this would change behavior. Since `aborted = true` was already being set inside the loop, the behavior is functionally identical.

## Variations
No variations needed.

## Canvas Smoke Test
Run the `canvas` test composition (`npm run test:e2e`) to ensure no pipeline lockups occur in multi-worker configurations.

## Correctness Check
Run the standard multi-worker `dom` benchmark and verify the output video generation completes successfully without dropped frames.

## Prior Art
PERF-704 and PERF-715 successfully eliminated empty `try/catch` blocks and closures in other parts of the hot loop to reduce AST size and GC pressure. The single-worker loop in `CaptureLoop.ts` was historically refactored to keep the `try/catch` completely outside its `for` loop.
