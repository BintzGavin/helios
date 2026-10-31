---
id: PERF-1155
slug: hoist-try-catch-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-11-01
completed: ""
result: ""
---

# PERF-1155: Hoist try-catch outside multi-worker runWorker loops

## Focus Area
Fast path multi-worker rendering logic in `CaptureLoop.ts`. Specifically, hoisting the `try...catch` block out of the `while (nextFrameToSubmit !== totalFrames && !aborted)` loop within the `runWorker` function.

## Background Research
Currently, inside the multi-worker path (`runWorker`), the `try...catch` block is placed *inside* the `while` loop. For every frame captured, V8 enters a new `try...catch` context. Although modern V8 (TurboFan) optimizes `try...catch` blocks much better than older engines, placing a `try...catch` block around await expressions inside a hot loop still incurs setup and teardown overhead across microtask boundaries on each iteration.

By hoisting the `try...catch` block to wrap the entire `while` loop, we reduce AST complexity and avoid creating a new exception handling context for every frame. When an error occurs, the loop aborts and the catch block catches the error, calls `checkState()`, and exits gracefully. Since `checkState()` already resolves the `writerWaiterPromise` upon abort, the logic remains perfectly safe and identical.

Microbenchmarks of inner vs outer `try...catch` blocks with asynchronous-like state show a ~6% reduction in loop execution time on V8.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode, multi-worker
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.49s
- **Bottleneck analysis**: Redundant exception handler context creation inside the hot multi-worker loop.

## Implementation Spec

### Step 1: Hoist `try-catch` outside the `while` loops in `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the multi-worker `runWorker` logic to hoist the `try...catch` block outside of the `while` loop.
For both the `isDomStrategy` branch and the `else` branch, change from:
```typescript
        if (isDomStrategy) {
          while (nextFrameToSubmit !== totalFrames && !aborted) {
            // ...
            if (i === -1) break;

            try {
              const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
              if (timePromise) {
                await timePromise;
              }
              const rawResult = await strategy.capture(page, i * timeStep);
              let buf: Buffer = Buffer.from(rawResult as string, "base64");
              frameBufferRing[i & ringMask] = buf;
            } catch (e) {
              fatalError = e;
              aborted = true;
              checkState();
            }
            writerWaiterPromise.resolve();
          }
        }
```
To:
```typescript
        if (isDomStrategy) {
          try {
            while (nextFrameToSubmit !== totalFrames && !aborted) {
              let i: number;
              if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
                i = nextFrameToSubmit++;
              } else {
                freeWorkers[freeWorkersHead++] = workerIndex;
                i = (await workerThenables[workerIndex]) as any as number;
              }

              if (i === -1) break;

              const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
              if (timePromise) {
                await timePromise;
              }

              const rawResult = await strategy.capture(page, i * timeStep);
              let buf: Buffer = Buffer.from(rawResult as string, "base64");
              frameBufferRing[i & ringMask] = buf;
              writerWaiterPromise.resolve();
            }
          } catch (e) {
            fatalError = e;
            aborted = true;
            checkState();
          }
        } else {
          try {
            while (nextFrameToSubmit !== totalFrames && !aborted) {
              let i: number;
              if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
                i = nextFrameToSubmit++;
              } else {
                freeWorkers[freeWorkersHead++] = workerIndex;
                i = (await workerThenables[workerIndex]) as any as number;
              }

              if (i === -1) break;

              const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
              if (timePromise) {
                await timePromise;
              }

              frameBufferRing[i & ringMask] = await strategy.capture(page, i * timeStep);
              writerWaiterPromise.resolve();
            }
          } catch (e) {
            fatalError = e;
            aborted = true;
            checkState();
          }
        }
```
**Why**: Ensures V8 TurboFan does not have to create exception contexts on every iteration of the hot multi-worker chunk loops, reducing AST node visits and minimizing microtask context switching overhead.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
Similar AST simplification and block scope unrolling experiments like PERF-1151 which removed redundant try/catch blocks in the single-worker path.
