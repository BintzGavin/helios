---
id: PERF-680
slug: inline-writerwaiterexecutor
status: complete
claimed_by: "executor"
created: 2024-06-05
completed: 2024-06-05
result: "discarded"
---

# PERF-680: Inline writerWaiterExecutor in CaptureLoop

## Focus Area
The `CaptureLoop` class hot loop in `packages/renderer/src/core/CaptureLoop.ts`. This specifically targets the allocation and closure scope lookup overhead associated with `writerWaiterExecutor`.

## Background Research
Currently, `CaptureLoop.ts` defines `writerWaiterExecutor` at the outer scope as a closure (`const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };`). Inside the hot `while (nextFrameToWrite < totalFrames && !aborted)` loop, when the writer needs to wait for a frame, it instantiates a new Promise using this pre-allocated executor: `await new Promise<void>(writerWaiterExecutor)`.

While avoiding allocating the executor function *itself* inside the loop saves an allocation, passing a closure into `new Promise` still requires V8 to look up the closure in its lexical scope and set up the execution context for the Promise constructor on every block.

In highly optimized V8 async hot loops, replacing a pre-allocated closure with an inline anonymous closure (e.g., `await new Promise<void>(resolve => { writerWaiterResolve = resolve; })`) can sometimes perform better. V8's TurboFan compiler is often capable of fully inlining anonymous closures passed directly to standard constructors like `Promise`, optimizing away the function call overhead completely, whereas passing an external reference forces a deoptimization or prevents deep inlining. Previous experiments (like PERF-662 and PERF-658) have confirmed that restoring inline anonymous closures for Promise executors in hot loops within this codebase yielded measurable performance improvements by bypassing the pre-bound method invocation overhead.

## Benchmark Configuration
- **Composition URL**: DOM benchmark composition (from `run-all.ts`)
- **Render Settings**: 600 frames, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.400s (median from PERF-678)
- **Bottleneck analysis**: Microtask and closure overhead in the V8 hot loops.

## Implementation Spec

### Step 1: Inline `writerWaiterExecutor`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove the declaration of `writerWaiterExecutor`:
   ```typescript
   <<<<<<< SEARCH
       let writerWaiterResolve: (() => void) | null = null;
       const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };

       // Multi-worker ACTOR MODEL with backpressure
   =======
       let writerWaiterResolve: (() => void) | null = null;

       // Multi-worker ACTOR MODEL with backpressure
   >>>>>>> REPLACE
   ```
2. In the `run` method's `try` block writer loop, replace the `await new Promise<void>(writerWaiterExecutor);` call with an inline closure:
   ```typescript
   <<<<<<< SEARCH
               if (frameReadyRing[ringIndex] === 0) {
                   await new Promise<void>(writerWaiterExecutor);
                   continue;
               }
   =======
               if (frameReadyRing[ringIndex] === 0) {
                   await new Promise<void>(resolve => { writerWaiterResolve = resolve; });
                   continue;
               }
   >>>>>>> REPLACE
   ```
**Why**: V8's JIT compiler often optimizes and inlines anonymous closures passed directly to native constructors like `Promise` more effectively than looking up an externally defined closure reference in the lexical scope, reducing function call overhead and GC pressure.
**Risk**: If V8 does not inline it, it might slightly increase allocation overhead. However, recent similar experiments in this codebase proved the opposite.

## Canvas Smoke Test
Run `npm run test:renderer` to ensure `CanvasStrategy` and other core paths are not broken by the loop structural change.

## Correctness Check
Run the DOM benchmark and manually ensure the output video is still generated correctly without deadlocks.

## Prior Art
- PERF-662: Inlined `virtualTimePromiseExecutor` in `CdpTimeDriver.ts` to avoid pre-bound method overhead, improving performance.
- PERF-658: Confirmed inline anonymous closures for `updateCurrentTime` were better than pre-bound handlers.
- PERF-632: Attempted custom deferred objects for workers which failed; native simple promises are best.

## Results Summary
- **Best render time**: 26.324s (vs baseline 23.23s)
- **Kept experiments**: (none)
- **Discarded experiments**: [inline writerWaiterExecutor]
