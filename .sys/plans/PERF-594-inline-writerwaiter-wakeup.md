---
id: PERF-594
slug: inline-writerwaiter-wakeup
status: claimed
claimed_by: "jules"
created: 2024-05-26
completed: "2024-05-26"
result: "discard"
---

# PERF-594: Inline `writerWaiterResolve` Wakeup into Promise Chain in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Hot loop orchestration in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently, the `runWorker` hot loop awaits the completion of the entire `timePromise` chain (which includes `strategy.capture()`) before checking and executing `writerWaiterResolve` to wake up the main writer loop.
```typescript
            await timePromise
                .then(() => strategy.capture(page, time))
                .then((buffer) => {
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                })
                .catch((e) => { ... });

            if (writerWaiterResolve && nextFrameToWrite === i) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```
By moving the `writerWaiterResolve` check and execution directly into the `.then` and `.catch` fulfillment handlers, we can trigger the writer loop's wakeup one microtask earlier. Instead of waiting for the `await timePromise` generator to resume in `runWorker` before waking the writer, the writer's promise resolves immediately when `frameReadyRing` is updated. This allows the main writer loop to wake up and process the ready frame sooner, overlapping its execution with the remainder of the `runWorker`'s loop iteration.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.374s (from RENDERER-EXPERIMENTS.md current best)
- **Bottleneck analysis**: Microtask latency between frame completion in the worker and the writer loop waking up to pipe the frame to FFmpeg.

## Implementation Spec

### Step 1: Inline `writerWaiterResolve` into Promise handlers
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function, modify the `timePromise` chain to execute the `writerWaiterResolve` logic inside the `.then` and `.catch` handlers, and remove it from after the `await` statement.

Replace:
```typescript
            await timePromise
                .then(() => strategy.capture(page, time))
                .then((buffer) => {
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                })
                .catch((e) => {
                    frameErrorRing[ringIndex] = e;
                    frameReadyRing[ringIndex] = 1;
                });
            if (writerWaiterResolve && nextFrameToWrite === i) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```

With:
```typescript
            await timePromise
                .then(() => strategy.capture(page, time))
                .then((buffer) => {
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                    if (writerWaiterResolve && nextFrameToWrite === i) {
                        const res = writerWaiterResolve;
                        writerWaiterResolve = null;
                        res();
                    }
                })
                .catch((e) => {
                    frameErrorRing[ringIndex] = e;
                    frameReadyRing[ringIndex] = 1;
                    if (writerWaiterResolve && nextFrameToWrite === i) {
                        const res = writerWaiterResolve;
                        writerWaiterResolve = null;
                        res();
                    }
                });
```

**Why**: Resolves the writer waiter promise inside the exact microtask where the frame is ready, saving the generator resumption overhead of the `runWorker` loop before the writer can start.
**Risk**: Negligible. The logical order remains exactly the same, but the execution overlaps more efficiently.

## Correctness Check
Run the `npx tsx packages/renderer/tests/fixtures/benchmark.ts` script to test performance, followed by `npm run test -w packages/renderer -- --run` to verify correctness and ensure no race conditions are introduced in the ring buffer.
