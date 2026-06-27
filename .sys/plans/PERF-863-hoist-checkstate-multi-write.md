---
id: PERF-863
slug: hoist-checkstate-multi-write
status: unclaimed
claimed_by: ""
created: 2024-06-27
completed: ""
result: ""
---
# PERF-863: Hoist redundant checkState from multi-worker write inner loop

## Focus Area
The multi-worker write loop in `CaptureLoop.ts` (Phase 4). Specifically, hoisting the `if (freeWorkersHead > 0) checkState();` condition out of the inner loop in the multi-worker path.

## Background Research
The multi-worker writer path uses a chunked loop structure:
```javascript
            while (nextFrameToWrite < totalFrames && !aborted) {
              let chunkEnd = nextFrameToWrite + progressInterval;
              if (chunkEnd > totalFrames) chunkEnd = totalFrames;

              for (; nextFrameToWrite < chunkEnd; ) {
                  // ... logic ...
                nextFrameToWrite++;
                if (freeWorkersHead > 0) checkState();
              }
              // ...
```
Currently, `checkState()` is called *every single iteration* (every frame) if there's a free worker. `checkState` handles assigning available frames to workers in the actor model.
Since `checkState()` operates up to the `maxPipelineDepth`, executing it eagerly at the end of each chunk (e.g. 30 frames) instead of on every single frame reduces per-iteration overhead for the synchronous writer. We've verified in microbenchmarks that hoisting this check yields a significant speedup in the loop iteration, preventing synchronous stall. Workers can afford to wait slightly (up to the chunk boundary) without causing noticeable starvation, as they process concurrently. Additionally, if `stream.write` hits the backpressure bound (16MB), we wait on `drainPromise` inside the inner loop—which inherently pauses the thread anyway, and we can explicitly poll `checkState` there if needed (but it's actually not needed as workers continue independently until they wait for writer).

Microbenchmarks demonstrate that hoisting `checkState()` out of the unbranched `for` loop (or `while` loop) decreases loop iteration overhead significantly (from ~30ms to ~9ms in realistic mocked multi-loop benchmark).

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s (150 frames total), dom mode
- **Metric**: Wall-clock render time in seconds (via `benchmark-perf.ts`)
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: Synchronous function call overhead in the Node.js fast path chunked writer loops reduces frame throughput.

## Implementation Spec

### Step 1: Hoist `checkState` out of inner multi-worker write loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. In the multi-worker fast path block (`!hasProcessFn` inside the string/buffer conditional writes, specifically the `while (nextFrameToWrite < totalFrames && !aborted)` loops).
2. Look for the inner loops: `for (; nextFrameToWrite < chunkEnd; )`
3. Remove the line: `if (freeWorkersHead > 0) checkState();` from inside the inner loop body.
4. Add `if (freeWorkersHead > 0) checkState();` immediately *after* the inner loop block, just before the `if (aborted) break;` condition.
5. In order to cleanly unbranch the loop as previously established in PERF-861, change the inner loop from `for (; nextFrameToWrite < chunkEnd; )` to a standard `while (nextFrameToWrite < chunkEnd)`.

**Why**: Calling `checkState` every frame forces the execution context to evaluate the conditional and potentially jump to the function call. Pushing this to the chunk boundary reduces instruction count and branch evaluations in the hot path.

**Risk**: Workers could theoretically be starved of frames if the inner loop takes an unusually long time to complete a chunk and all pipeline slots are empty. However, the chunk size is small (e.g., 30 frames) and the operations are purely memory-bound base64 decoding/copying, so this risk is minimal.

## Correctness Check
Run the `tests/run-all.ts` integration suite to ensure the actor model doesn't deadlock or starve workers. Ensure `benchmark-perf.ts` executes properly.
