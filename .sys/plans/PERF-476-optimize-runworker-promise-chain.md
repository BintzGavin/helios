---
id: PERF-476
slug: optimize-runworker-promise-chain
status: unclaimed
claimed_by: ""
created: 2026-05-11
completed: ""
result: ""
---

# PERF-476: Optimize runWorker Loop Promise Chain

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `runWorker` execution loop.

## Background Research
The `runWorker` function inside `CaptureLoop.ts` handles the execution of frame generation by sequentially awaiting `timeDriver.setTime()` and `strategy.capture()`. It is currently structured as an `async` function containing a `while (!aborted)` loop.

V8's `async/await` syntax relies on an internal state machine (generator) implementation. In extremely hot loops dealing with small unit-of-work promises (like Playwright's CDP pipeline and small microtasks), the overhead of allocating these state machines and tracking the generator continuation state can occasionally be slower than explicitly chaining `.then()` closures natively.

Our benchmark in the Node.js environment showed that a recursive `.then()` chain processing native Promises can be ~25-30% faster than `async`/`await` in synthetic microtask benchmarks (13.5ms vs 18.2ms). Because `timeDriver.setTime()` and `strategy.capture()` are the core execution bottleneck per frame, reducing any synchronous/microtask suspension overhead around them can potentially increase total frame generation throughput.

In this plan, we will restructure the `runWorker` loop from an `async` loop into a function returning a single `.then()` recursion chain.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 600x600, 30fps, mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.513s
- **Bottleneck analysis**: The V8 generator state machine and context saving during `async/await` around hot `setTime` and `capture` promises.

## Implementation Spec

### Step 1: Replace async runWorker with recursive promise chain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change `const runWorker = async (worker: WorkerInfo, workerIndex: number) => { ... }` to a non-async function returning a Promise.
Use an internal recursive function (e.g. `function nextTick()`) that returns the next step in the loop or resolves the top-level promise.

```typescript
    const runWorker = (worker: WorkerInfo, workerIndex: number): Promise<void> => {
        const { timeDriver, strategy, page } = worker;

        return new Promise<void>((resolveLoop) => {
            const nextTick = () => {
                if (aborted) {
                    resolveLoop();
                    return;
                }

                let i: number;
                if (nextFrameToSubmit >= this.totalFrames) {
                    resolveLoop();
                    return;
                } else if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
                    i = nextFrameToSubmit++;
                    const ringIndex = i & ringMask;

                    frameReadyRing[ringIndex] = 0;
                    frameBufferRing[ringIndex] = null;
                    frameErrorRing[ringIndex] = null;

                    if (frameWaiterResolve) {
                        const fRes = frameWaiterResolve;
                        frameWaiterResolve = null;
                        fRes();
                    }
                    processFrame(i);
                } else {
                    new Promise<number>(workerBlockedExecutors[workerIndex]).then((resolvedI) => {
                        if (resolvedI === -1) {
                            resolveLoop();
                            return;
                        }
                        processFrame(resolvedI);
                    });
                }
            };

            const processFrame = (i: number) => {
                const time = i * timeStep;
                const compositionTimeInSeconds = (this.startFrame + i) * compTimeStep;
                const ringIndex = i & ringMask;

                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);

                const onSetTimeComplete = () => {
                     const captureResult = strategy.capture(page, time);
                     const onCaptureComplete = (buffer: any) => {
                          frameBufferRing[ringIndex] = buffer;
                          frameReadyRing[ringIndex] = 1;
                          if (writerWaiterResolve) {
                              const res = writerWaiterResolve;
                              writerWaiterResolve = null;
                              res();
                          }
                          nextTick();
                     };

                     const onCaptureError = (e: any) => {
                          frameErrorRing[ringIndex] = e;
                          frameReadyRing[ringIndex] = 1;
                          if (writerWaiterResolve) {
                              const res = writerWaiterResolve;
                              writerWaiterResolve = null;
                              res();
                          }
                          nextTick();
                     };

                     if (captureResult && captureResult.then) {
                         captureResult.then(onCaptureComplete, onCaptureError);
                     } else {
                         onCaptureComplete(captureResult);
                     }
                };

                if (setTimeResult && setTimeResult.then) {
                    setTimeResult.then(onSetTimeComplete).catch((e) => {
                        frameErrorRing[ringIndex] = e;
                        frameReadyRing[ringIndex] = 1;
                        if (writerWaiterResolve) {
                            const res = writerWaiterResolve;
                            writerWaiterResolve = null;
                            res();
                        }
                        nextTick();
                    });
                } else {
                    onSetTimeComplete();
                }
            };

            nextTick();
        });
    };
```

**Why**: Direct `.then()` chaining removes `async` generator context switching.
**Risk**: If promises resolve synchronously, the call stack might blow up. However, Playwright CDP evaluations and page rendering are inherently asynchronous (crossing I/O boundaries), which resets the call stack on every iteration.

## Variations
None.

## Correctness Check
Run `npm run build` and `npx tsx scripts/benchmark-test.js` from `packages/renderer/` to ensure the benchmark outputs frames and renders correctly. Compare the render time to the baseline.
