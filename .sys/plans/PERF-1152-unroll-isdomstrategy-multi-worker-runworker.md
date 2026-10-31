---
id: PERF-1152
slug: unroll-isdomstrategy-multi-worker-runworker
status: unclaimed
claimed_by: ""
created: 2024-10-31
completed: ""
result: ""
---

# PERF-1152: Unroll isDomStrategy in multi worker runWorker

## Focus Area
The multi-worker logic for `runWorker` in `CaptureLoop.ts` contains `if (isDomStrategy)` checks that can be hoisted.

## Background Research
Currently, the `runWorker` closure in the multi-worker path contains a nested `if (isDomStrategy)` block that is checked on every single frame rendering step by every worker. Since `isDomStrategy` is determined per-worker (based on `worker.strategy`), it evaluates the same branch conditionally inside a hot loop. Unrolling `runWorker` into two separate implementations (one for DOM, one for non-DOM) prevents unnecessary repeated checks, simplifying the V8 AST and potentially reducing TurboFan branch parsing overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.49s
- **Bottleneck analysis**: Micro optimizations inside the hot multi-worker loops.

## Implementation Spec

### Step 1: Hoist isDomStrategy check to outer scope inside runWorker creation
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the `const runWorker = async (worker: WorkerInfo, workerIndex: number) => { ... }` block (around line 459):
```typescript
      const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const isDomStrategy = !!(strategy as any).beginFrameParams;

        if (isDomStrategy) {
          while (nextFrameToSubmit !== totalFrames && !aborted) {
            let i: number;
            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
              i = nextFrameToSubmit++;
            } else {
              freeWorkers[freeWorkersHead++] = workerIndex;
              i = (await workerThenables[workerIndex]) as any as number;
            }

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
        } else {
          while (nextFrameToSubmit !== totalFrames && !aborted) {
            let i: number;
            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
              i = nextFrameToSubmit++;
            } else {
              freeWorkers[freeWorkersHead++] = workerIndex;
              i = (await workerThenables[workerIndex]) as any as number;
            }

            if (i === -1) break;

            try {
              const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
              if (timePromise) {
                await timePromise;
              }

              frameBufferRing[i & ringMask] = await strategy.capture(page, i * timeStep);
            } catch (e) {
              fatalError = e;
              aborted = true;
              checkState();
            }
            writerWaiterPromise.resolve();
          }
        }
      };
```
**Why**: Reduces AST parsing depth and conditional evaluation in hot loops.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
Previous single and multi-worker unrolling optimizations (e.g. PERF-988, PERF-1102).
