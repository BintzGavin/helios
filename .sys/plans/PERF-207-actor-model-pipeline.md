---
id: PERF-207
slug: actor-model-pipeline
status: complete
claimed_by: ""
created: 2026-10-18
completed: ""
result: no-improvement
---
# PERF-207: Actor Model Frame Pipeline

## Focus Area
The frame capture hot loop in `packages/renderer/src/Renderer.ts`.

## Background Research
Currently, the `captureLoop` iterates sequentially through all frames, synchronously assigning them to workers in a round-robin fashion. To prevent a worker from processing its next frame before finishing the current one, it chains promises on a per-worker basis (`worker.activePromise = framePromise as unknown as Promise<void>`). This approach allocates a massive chain of Promises in V8 and forces Node.js to manage a deeply nested continuation queue, causing significant micro-stalls and GC pressure.
By refactoring the pipeline into an "Actor Model", we can instantiate a number of concurrent async worker loops equal to the size of the worker pool. Each worker loop pulls the next available frame index from a shared counter, `await`s the capture natively, and places the result in the shared buffer. This completely eliminates `activePromise` chaining and drastically flattens the V8 execution graph.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/simple-animation/composition.html
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), libx264
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.7s
- **Bottleneck analysis**: V8 Promise chaining and state machine overhead in the `captureLoop`.

## Implementation Spec

### Step 1: Replace Round-Robin Loop with Worker Actors
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
1. Remove `worker.activePromise` logic completely from the `captureWorkerFrame` loop and the pool.
2. Replace the current queuing logic with an array of independent async functions (one per worker in `pool`).
3. Inside each worker's async loop, sequentially read from the shared counter until all frames are completed.
4. For each frame, use the existing calculation logic to determine time and composition time, execute `timeDriver.setTime`, capture the frame, and await its resolution directly inside the loop instead of chaining it.
5. Store the resolved frame data in the buffer.
6. Await all worker loops concurrently alongside the FFmpeg writer loop.

**Why**: Eliminates `activePromise` chaining, flattens the async call stack, and reduces V8 GC pressure.
**Risk**: Potential logic regressions if the shared counter is mutated asynchronously in a way that skips or duplicates frames.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to ensure frame generation is still sequentially correct per worker.
## Results Summary
- **Best render time**: 33.357s (vs baseline 33.33s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [Refactor CaptureLoop to Actor Model]
