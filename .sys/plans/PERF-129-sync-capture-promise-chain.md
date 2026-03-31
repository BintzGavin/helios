---
id: PERF-129
slug: sync-capture-promise-chain
status: complete
claimed_by: ""
created: 2026-03-31
completed: ""
result: ""
---
# PERF-129: Optimize capture promise chain in processWorkerFrame

## Focus Area
Frame capture hot loop in `packages/renderer/src/Renderer.ts`. Specifically targeting the parallel execution and promise chaining inside `processWorkerFrame` to maximize Node-to-Chromium IPC throughput.

## Background Research
Currently in `Renderer.ts`, the `processWorkerFrame` function looks like this:
```typescript
          const processWorkerFrame = async (worker: any, compositionTimeInSeconds: number, time: number) => {
              await worker.activePromise.catch(() => {});
              const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
              const capturePromise = worker.strategy.capture(worker.page, time);
              await setTimePromise;
              return await capturePromise;
          };
```

This logic pipelines `setTime` and `capture` concurrently (an optimization introduced in PERF-114). However, it awaits `worker.activePromise` sequentially *before* issuing the `setTime` and `capture` commands for the next frame.

While we must ensure Chromium finishes rendering the previous frame before we advance time and capture the next one (to avoid "Another frame is pending" crashes), awaiting `activePromise` inside the `async` function forces the Node.js event loop to pause the entire execution context for this worker, wait for the previous frame's IPC response to traverse the socket and resolve the promise, and only *then* queue the next IPC commands.

By utilizing `.then()` to chain the next frame's commands directly onto the resolution of the previous frame's promise, we can construct the next IPC requests immediately and hand them off to the underlying Node.js network layer. This avoids context-switching back into an `async/await` generator step in the middle of the hot loop, reducing JS execution overhead and keeping the IPC socket saturated.

Instead of an `async` function, we can just return the chained promise:
```typescript
          const processWorkerFrame = (worker: any, compositionTimeInSeconds: number, time: number) => {
              return worker.activePromise.catch(() => {}).then(() => {
                  const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
                  const capturePromise = worker.strategy.capture(worker.page, time);
                  return setTimePromise.then(() => capturePromise);
              });
          };
```
This is a purely synchronous function that returns a constructed promise chain, avoiding `async`/`await` allocation overhead entirely.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: The Playwright Node.js process is CPU bound. Minor GC overhead from promise execution contexts and micro-delays between `await` resumption and IPC queuing limits maximum throughput.

## Implementation Spec

### Step 1: Replace async `processWorkerFrame` with a synchronous promise chain
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside the `captureLoop` definition (around line 286), completely replace the `async` `processWorkerFrame` function with a standard arrow function that returns a `.then()` chain off `worker.activePromise`:

```typescript
// BEFORE:
          const processWorkerFrame = async (worker: any, compositionTimeInSeconds: number, time: number) => {
              await worker.activePromise.catch(() => {});
              const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
              const capturePromise = worker.strategy.capture(worker.page, time);
              await setTimePromise;
              return await capturePromise;
          };

// AFTER:
          const processWorkerFrame = (worker: any, compositionTimeInSeconds: number, time: number) => {
              return worker.activePromise.catch(() => {}).then(() => {
                  const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
                  const capturePromise = worker.strategy.capture(worker.page, time);
                  return setTimePromise.then(() => capturePromise);
              });
          };
```

**Why**: By returning a direct promise chain, we eliminate the V8 generator and microtask allocation required for `async`/`await`. We instruct V8 to link the resolution of `worker.activePromise` directly to the execution of the next frame's IPC commands, slightly reducing GC pressure and execution latency in the tight 1000+ iteration frame capture loop.
**Risk**: None. The execution order and concurrency semantics remain exactly identical.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid output.

## Prior Art
- PERF-114: Pipelined `setTime` and `capture`.
- PERF-125: Eliminated redundant `try-catch` contexts around `activePromise`.
- PERF-089: Hoisted the worker function definition to reduce allocations.

## Results Summary
- **Best render time**: 33.431s
- **Kept experiments**: [PERF-129]
