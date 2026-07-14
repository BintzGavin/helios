---
id: PERF-1002
slug: merge-is-dom-strategy-loops-multi-worker-no-process-fn
status: unclaimed
claimed_by: ""
created: 2024-07-14
completed: ""
result: ""
---

# PERF-1002: Unroll `isDomStrategy` loop in the multi-worker `!hasProcessFn` path

## Focus Area
The `!hasProcessFn` multi-worker capture loop in `CaptureLoop.ts` continuously checks `if (isDomStrategy)` on every iteration, leading to redundant branch evaluations in the hot path.

## Background Research
The `CaptureLoop.ts` file contains a hot path for processing video frames across multiple workers when `!hasProcessFn` is true (lines 664-710). Within this loop, an `if (isDomStrategy)` check routes execution between the DOM strategy and the Canvas strategy. Because `isDomStrategy` is a loop-invariant boolean constant evaluated *before* the loop, we can hoist this conditional outside the loop to eliminate dynamic branch prediction overhead.
By unrolling this logic, we provide V8 with isolated monomorphic execution paths, reducing AST size and improving JIT compilation efficiency.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/benchmark` (or standard DOM benchmark)
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `if (isDomStrategy)` check in the `!hasProcessFn` loop of the multi-worker path causes unnecessary branch evaluation on every frame.
- **Current estimated render time**: Baseline from RENDERER-EXPERIMENTS.md.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` out of the `!hasProcessFn` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the single `while` loop that contains `if (isDomStrategy)` in the `!hasProcessFn` `else` block (around line 663) with two separate `while` loops, conditioned on an outer `if (isDomStrategy)` check.

```typescript
        } else {
          let maxSubmits = nextFrameToWrite + maxPipelineDepth;
          if (isDomStrategy) {
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
          } else {
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
        }
```

**Why**: Hoisting the loop-invariant `isDomStrategy` check out of the loop allows the V8 TurboFan compiler to optimize two completely separate, branchless while loops. This prevents branch prediction overhead and allows better instruction pipelining.
**Risk**: Small potential for code duplication, but acceptable given the micro-optimization context of hot loops. Need to ensure correctness of both DOM and Canvas processing remains intact.

## Canvas Smoke Test
Run `npx vitest -t "verify-canvas-strategy"` to ensure the Canvas strategy path works.

## Correctness Check
Run `npx vitest -t "verify-dom-strategy-capture"` to ensure the DOM path is still functioning correctly.

## Prior Art
Similar loop unrolling optimizations like PERF-988, PERF-990, PERF-995 have proven effective at reducing redundant evaluations and overhead in tight engine loops.
