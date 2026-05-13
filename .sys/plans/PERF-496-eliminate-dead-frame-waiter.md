---
id: PERF-496
slug: eliminate-dead-frame-waiter
status: unclaimed
claimed_by: ""
created: 2026-05-13
completed: ""
result: ""
---

# PERF-496: Eliminate Dead Frame Waiter Logic in CaptureLoop

## Focus Area
The `CaptureLoop` orchestrator in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the dead code associated with `frameWaiterResolve` and the `nextFrameToSubmit <= nextFrameToWrite` check.

## Background Research
In the current implementation of `CaptureLoop.ts`, the actor model proactively assigns frames to free workers using a stack (`freeWorkers`). Workers grab a task, wait for the `checkState` lock, and process frames concurrently.
Inside the main orchestrator `while (nextFrameToWrite < this.totalFrames && !aborted)` loop (around line 243), there is a defensive check:
`if (nextFrameToSubmit <= nextFrameToWrite) { await new Promise<void>(frameWaiterExecutor); continue; }`
Because the orchestrator pre-assigns tasks into the pipeline deeply (`maxPipelineDepth`), `nextFrameToSubmit` will aggressively advance far ahead of `nextFrameToWrite` as long as there are free workers. The *only* way `nextFrameToSubmit <= nextFrameToWrite` could ever evaluate to true is if `maxPipelineDepth` was 0, or if the main loop was spinning faster than tasks could be added. However, `checkState()` is called unconditionally at the top of the `while` loop (line 244), which immediately loops through `freeWorkers` and bumps `nextFrameToSubmit` synchronously if workers are available. If workers are blocked, `nextFrameToSubmit` is already well ahead of `nextFrameToWrite`.
This means the `frameWaiterResolve` synchronization primitive is entirely dead code. V8 still has to compile it, manage the lexical scopes, and check the condition. Eliminating this branch and the associated promise executor will reduce instruction cache pressure and closure allocations in the hot path.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~4.169s (PERF-493)
- **Bottleneck analysis**: Dead code and redundant branch checks in the V8 hot loop reducing JIT efficiency.

## Implementation Spec

### Step 1: Remove `frameWaiterResolve` references
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove all definitions and invocations of `frameWaiterResolve` and `frameWaiterExecutor`.
- Remove: `let frameWaiterResolve: (() => void) | null = null;`
- Remove: `const frameWaiterExecutor = (resolve: () => void) => { frameWaiterResolve = resolve; };`
- Remove all blocks like:
```typescript
            if (frameWaiterResolve) {
                const fRes = frameWaiterResolve;
                frameWaiterResolve = null;
                fRes();
            }
```
from `checkState` and `runWorker` and the `if (aborted)` cleanup blocks.

### Step 2: Remove the defensive wait branch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the main `while (nextFrameToWrite < this.totalFrames && !aborted)` loop, remove the defensive check entirely:
```typescript
<<<<<<< SEARCH
            // Wait for the task to be queued by a worker or immediately queued
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(frameWaiterExecutor);
                continue;
            }

            const ringIndex = nextFrameToWrite & ringMask;
=======
            const ringIndex = nextFrameToWrite & ringMask;
>>>>>>> REPLACE
```
**Why**: This branch is mathematically unreachable given the pre-allocation of tasks and the synchronous assignment in `checkState()`.
**Risk**: If there is an unforeseen edge case where workers are completely stalled and pipeline depth is 0, the main loop could spin asynchronously waiting for `writerWaiterExecutor`. But since `writerWaiterExecutor` already blocks until a frame is ready at the expected index, it naturally provides the required backpressure.

## Variations
- None.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure the pipeline orchestrator does not deadlock or drop frames.
