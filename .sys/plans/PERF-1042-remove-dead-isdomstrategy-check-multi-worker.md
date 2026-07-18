---
id: PERF-1042
slug: remove-dead-isdomstrategy-check-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1042: Remove dead isDomStrategy checks in multi-worker runWorker loop

## Focus Area
The `runWorker` function within `packages/renderer/src/core/CaptureLoop.ts` handles task dispatch for the multi-worker parallel rendering pool.

## Background Research
Currently, inside the `hasProcessFn` path and `!hasProcessFn` path, the `runWorker` function has redundant logic.
Because `DomStrategy` has no `processCaptureResult` method (it processes everything via CDP internally), `isDomStrategy` will never be true in the `hasProcessFn` branch. Therefore, we can eliminate the `isDomStrategy` true block in `hasProcessFn` completely, and similarly, we can restructure `runWorker` by doing an initial `if (isDomStrategy)` check at the very top level, entirely skipping the `hasProcessFn` check for DOM strategy.

This allows us to completely remove the duplicated blocks.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 compiler parses and generates code for large unused blocks within the hot multi-worker closure initialization, bloating AST size.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` in `runWorker` and remove dead code
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker` around line 740, rewrite the dispatch logic to be:

```typescript
      const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const hasProcessFn = !!strategy.processCaptureResult;
        const isDomStrategy = !!(strategy as any).beginFrameParams;

        if (isDomStrategy) {
          const domCdpSession = (strategy as any).cdpSession;
          const domBeginFrameParams = (strategy as any).beginFrameParams;
          const domBeginFrame = () => domCdpSession!.send("HeadlessExperimental.beginFrame", domBeginFrameParams);
          let domLastFrameData: any = (strategy as any).lastFrameData;
          let domLastFrameBuffer: Buffer | null = null;

          let maxSubmits = nextFrameToWrite + maxPipelineDepth;
          while (!aborted && nextFrameToSubmit < totalFrames) {
            let i: number;
            if (nextFrameToSubmit < maxSubmits) {
              i = nextFrameToSubmit++;
              const ringIndex = i & ringMask;
              frameBufferRing[ringIndex] = null;
            } else {
              freeWorkers[freeWorkersHead++] = workerIndex;
              i = (await workerThenables[workerIndex]) as any as number;
              maxSubmits = nextFrameToWrite + maxPipelineDepth;
            }

            if (i === -1) break;
            const ringIndex = i & ringMask;

            try {
              let buffer: any;
              timeDriver.setTime(page, (startFrame + i) * compTimeStep);
              const rawResult = await domBeginFrame!();
              const data = (rawResult as any).screenshotData;
              let buf: Buffer;
              if (data) {
                domLastFrameData = data;
                buf = Buffer.from(data as string, "base64");
                domLastFrameBuffer = buf;
              } else {
                buf = domLastFrameBuffer!;
              }
              buffer = buf;
              frameBufferRing[ringIndex] = buffer;
            } catch (e) {
              fatalError = e;
              aborted = true;
              checkState();
            }
            writerWaiterPromise.resolve();
          }
        } else if (hasProcessFn) {
          let maxSubmits = nextFrameToWrite + maxPipelineDepth;
          while (!aborted && nextFrameToSubmit < totalFrames) {
            let i: number;
            if (nextFrameToSubmit < maxSubmits) {
              i = nextFrameToSubmit++;
              const ringIndex = i & ringMask;

              frameBufferRing[ringIndex] = null;
            } else {
              freeWorkers[freeWorkersHead++] = workerIndex;
              i = (await workerThenables[workerIndex]) as any as number;
              maxSubmits = nextFrameToWrite + maxPipelineDepth;
            }

            if (i === -1) break;

            const ringIndex = i & ringMask;

            try {
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i) * compTimeStep,
              );
              if (timePromise) {
                await timePromise;
              }
              let buffer: any;
              buffer = strategy.processCaptureResult!(
                await strategy.capture(page, i * timeStep),
              );
              frameBufferRing[ringIndex] = buffer;

            } catch (e) {
              fatalError = e;
              aborted = true;
              checkState();
            }
            writerWaiterPromise.resolve();
          }
        } else {
          let maxSubmits = nextFrameToWrite + maxPipelineDepth;
          while (!aborted && nextFrameToSubmit < totalFrames) {
            let i: number;
            if (nextFrameToSubmit < maxSubmits) {
              i = nextFrameToSubmit++;
              const ringIndex = i & ringMask;
              frameBufferRing[ringIndex] = null;
            } else {
              freeWorkers[freeWorkersHead++] = workerIndex;
              i = (await workerThenables[workerIndex]) as any as number;
              maxSubmits = nextFrameToWrite + maxPipelineDepth;
            }

            if (i === -1) break;
            const ringIndex = i & ringMask;

            try {
              let buffer: any;
              const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
              if (timePromise) {
                await timePromise;
              }
              buffer = await strategy.capture(page, i * timeStep);
              frameBufferRing[ringIndex] = buffer;
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

## Correctness Check
Run general tests: `npm run test -w packages/renderer`.
