---
id: PERF-1164
slug: extract-runworker-closures
status: complete
claimed_by: "jules"
created: 2024-11-02
completed: "2026-11-03"
result: "keep"
---

# PERF-1164: Extract runWorker closures to simplify V8 AST in multi-worker path

## Focus Area
The multi-worker loop initialization inside `CaptureLoop.ts` `run()` method (specifically the `runWorker` definition around lines 472-529).

## Background Research
Currently in `CaptureLoop.ts`, in the multi-worker path, a single `runWorker` closure is created for all workers. Inside this closure, an `isDomStrategy` check splits the execution into two separate `while` loops:

```typescript
      const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const isDomStrategy = !!(strategy as any).beginFrameParams;

        if (isDomStrategy) {
          try {
             // ... loop with base64 decoding ...
          } catch (e) { ... }
        } else {
          try {
             // ... loop without base64 decoding ...
          } catch (e) { ... }
        }
      };
```

Because `isDomStrategy` is identical for all workers in a given render, we can hoist this check outside of the worker loop creation entirely. By defining a monomorphic `runDomWorker` or `runCanvasWorker` and assigning it based on the strategy, we shrink the size of the closure that V8 must parse and compile, eliminating the dead branch (the `else` block) for the chosen strategy. This reduces the AST footprint inside the tight loop closure and improves instruction caching.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~21.0s (based on latest benchmark logs)
- **Bottleneck analysis**: Large polymorphic closures inflate JS AST size and slow down JIT compilation inside hot execution paths.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` check and extract `runWorker` loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Near the definition of `runWorker` (around line 472), replace the single monolithic `runWorker` definition with a conditional assignment of specialized closures:

```typescript
      const isDomStrategy = !!(this.pool[0].strategy as any).beginFrameParams;

      const runWorker = isDomStrategy
        ? async (worker: WorkerInfo, workerIndex: number) => {
            const { timeDriver, strategy, page } = worker;
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
          }
        : async (worker: WorkerInfo, workerIndex: number) => {
            const { timeDriver, strategy, page } = worker;
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
          };

      const workerPromises = this.pool.map((w, i) => runWorker(w, i));
```

**Why**: By deciding the worker closure logic once *before* instantiating the workers, we provide V8 with a monomorphic function that contains exactly one `while` loop, completely eliminating the dead code branch from the AST for that run.
**Risk**: Minimal runtime risk; the exact same logic is executed.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure the canvas specific closure executes properly.

## Correctness Check
Run `npm run test --workspace=packages/renderer` to verify multi-worker DOM rendering correctly assigns and executes tasks.

## Prior Art
Hoisting identical branch blocks for AST reduction (PERF-1158, PERF-1159, PERF-1160, PERF-1161).
