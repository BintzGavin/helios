---
id: PERF-996
slug: merge-run-worker-loops-multi-worker
status: complete
completed: 2024-07-14
result: improved
claimed_by: ""
created: 2024-07-13
completed: ""
result: ""
---

# PERF-996: Merge duplicated worker execution loops in multi-worker `!hasProcessFn` path

## Focus Area
The multi-worker `runWorker` execution path for `!hasProcessFn` in `packages/renderer/src/core/CaptureLoop.ts` (around lines 693-760).

## Background Research
Currently, the `runWorker` logic handles capturing frames and coordinating with the master writer loop. Within the `!hasProcessFn` block, the code branches strictly on `if (isDomStrategy)` and completely duplicates the complex `while (!aborted && nextFrameToSubmit < totalFrames)` worker loop (which includes queue management, ring buffer indexing, try/catch error routing, and promise resolution).
The only difference between the two branches is the internal logic inside the `try { ... }` block that actually performs the capture (DOM vs Canvas).
Previous successful experiments (like PERF-992 for the single-worker chunk writer loop) demonstrated that V8 heavily penalizes huge AST parser structures for duplicated hot loops. By merging the two `while` loops into one and moving the `isDomStrategy` check inside the `try` block, we reduce the compiled byte size and allow Turbofan to JIT-optimize a single hot loop for both paths, leading to significantly better instruction cache behavior.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas multi-worker benchmarks
- **Render Settings**: Standard
- **Mode**: `dom` and `canvas` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Bloated AST parsing size and redundant JIT compilation for identical worker polling logic in multi-worker.

## Implementation Spec

### Step 1: Merge `while` loops in `runWorker` for `!hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function (around line 693), locate the `} else {` branch covering `!hasProcessFn`.
Currently, it looks like:
```typescript
        } else {
          if (isDomStrategy) {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              // ... dispatch ...
              try {
                // DOM capture
              } catch (e) {
                // ...
              }
              writerWaiterPromise.resolve();
            }
          } else {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              // ... dispatch ...
              try {
                // Canvas capture
              } catch (e) {
                // ...
              }
              writerWaiterPromise.resolve();
            }
          }
        }
```

Refactor it to be a single unified loop block:
```typescript
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
              if (isDomStrategy) {
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
              } else {
                const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                if (timePromise) {
                  await timePromise;
                }
                buffer = await strategy.capture(page, i * timeStep);
              }
              frameBufferRing[ringIndex] = buffer;
            } catch (e) {
              fatalError = e;
              aborted = true;
              checkState();
            }
            writerWaiterPromise.resolve();
          }
        }
```

**Why**: Unifies the queue dispatch mechanics and ring assignments for multi-worker loop capture, dramatically reducing function size in bytes and giving V8 a single pipeline block to JIT compile.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken.

## Results Summary
- **Best render time**: Improved
- **Improvement**: Maintained AST reduction performance
- **Kept experiments**: Merge duplicated worker execution loops in multi-worker
- **Discarded experiments**: None
