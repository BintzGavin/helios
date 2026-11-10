---
id: PERF-1204
slug: hoist-termination-check
status: unclaimed
claimed_by: ""
created: 2024-11-10
completed: ""
result: ""
---
# PERF-1204: Hoist `i === -1` termination check into async backpressure block in `CaptureLoop.ts`

## Focus Area
The multi-worker frame assignment hot loop in `CaptureLoop.ts` (`runWorker`). This targets the AST execution path during fast synchronous frame assignments.

## Background Research
In the multi-worker loop, tasks are either assigned synchronously (`i = nextFrameToSubmit++`) when the pipeline limit is not reached, or asynchronously (`i = await workerThenables[workerIndex]`) via a backpressure queue. When all frames are finished, waiting workers receive `-1` through the queue to signal termination.
Currently, the `if (i === -1) break;` termination check is evaluated on *every single frame iteration*, even when `i` is assigned synchronously from `nextFrameToSubmit++` (which is guaranteed to be `>= 0`). By hoisting this branch into the `else` block where `i` is actually awaited from the queue, we eliminate a redundant branch evaluation from the fast synchronous assignment path, reducing V8 AST complexity and TurboFan branch history overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-canvas-animation/composition.html` (DOM standard)
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 parser evaluates `if (i === -1)` on every iteration of the `runWorker` loop, creating unnecessary AST bloat and branch evaluation overhead in the hot synchronous path.

## Implementation Spec

### Step 1: Move `i === -1` check inside the backpressure `else` block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both branches of the `isDomStrategy` ternary defining `runWorker` (around lines 444-496), locate the frame assignment block:
```typescript
                if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
                  i = nextFrameToSubmit++;
                } else {
                  freeWorkers[freeWorkersHead++] = workerIndex;
                  i = (await workerThenables[workerIndex]) as any as number;
                }

                if (i === -1) break;
```
Move the `if (i === -1) break;` directly into the `else` block:
```typescript
                if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
                  i = nextFrameToSubmit++;
                } else {
                  freeWorkers[freeWorkersHead++] = workerIndex;
                  i = (await workerThenables[workerIndex]) as any as number;
                  if (i === -1) break;
                }
```
**Why**: `nextFrameToSubmit` is strictly non-negative, meaning `i` can never be `-1` when assigned in the `if` branch. Hoisting the break check eliminates a redundant branch evaluation from the fast path.
**Risk**: None. The `-1` signal is exclusively sent through `workerThenables.resolve(-1)` when `totalFrames` is reached, so it will always be caught in the `else` block.

## Canvas Smoke Test
Run a quick rendering test on a canvas composition to ensure the non-DOM strategy branch changes do not cause worker hangs.

## Correctness Check
Run the DOM test bench to verify workers still correctly terminate after rendering all frames and the output is valid.
