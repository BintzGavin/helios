---
id: PERF-1130
slug: inline-capture-methods
status: complete
claimed_by: "executor"
created: 2024-10-22
completed: ""
result: "improved"
---
# PERF-1130: Inline `domBeginFrame` evaluation in CaptureLoop.ts

## Focus Area
DOM rendering loop (`CaptureLoop.ts`). Target: V8 CPU overhead caused by repeated function closures and dynamic callback evaluations per frame in the single-worker path.

## Background Research
In the `CaptureLoop.ts` fast loop, we conditionally evaluate `domBeginFrame!()` if `isDomStrategy` is true and `timeDriver.setTime()` starts executing.
Because `domBeginFrame` is a function reference passed into `CaptureLoop`, it adds a layer of function-invocation overhead inside the tight loop.
Since we're running Node on a CPU bound pipeline, and we know that `isDomStrategy` dictates if `domBeginFrame` is defined or needed, we can theoretically rewrite how `domBeginFrame` signals are triggered. Wait, `domBeginFrame` triggers CDP `Animation.setPlaybackRate` internals or shadow DOM synchronization inside `Renderer.ts`. It *must* be called.

What about `onProgress`?
```typescript
            if (onProgress) {
              onProgress(nextProgress / totalFrames);
            }
```
`onProgress` is also checked conditionally. If `onProgress` is not provided (e.g. CLI non-interactive mode), we still execute a truthiness check `if (onProgress)` and a math calculation `nextProgress / totalFrames` every `progressInterval` frames.
We can completely extract the `onProgress` check into an outer closure wrapper around the loop, but that creates two nearly identical copies of the multi-megabyte looping function. That would balloon the AST, which V8 penalizes.

Let's look at `isDomStrategyWriter` in the multi-worker path.
Is there any remaining `isDomStrategy` branching inside the single-worker loops that we missed?
In PERF-1102 and PERF-1028 we unrolled these checks. The DOM and Canvas paths are totally isolated inside `!hasProcessFn`.
```typescript
        if (isDomStrategy) {
            // pure DOM loop
        } else {
            // pure Canvas loop
        }
```
This is fully optimal for V8 branch prediction.

Let's look at the `totalFrames` initial condition:
```typescript
        if (totalFrames > 0) {
```
Is this checked multiple times? Yes, we check `if (totalFrames > 0)` at the start of `hasProcessFn === false` and `hasProcessFn === true`.
We can hoist this `if (totalFrames > 0)` to the very top of `start()`, wrapping the entire execution logic, because if `totalFrames === 0`, nothing should be processed anyway. By wrapping it at the top, we eliminate multiple duplicate branch evaluations deep in the multi-worker/single-worker tree.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1080p, 60fps, fixed duration.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: Micro-optimizing AST execution bounds to reduce redundant logic paths.

## Implementation Spec

### Step 1: Hoist `totalFrames > 0` condition globally
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Move the `if (totalFrames > 0)` block to wrap the primary `if (workers > 1)` / `else` logic inside `start()`.
Currently it might look like:
```typescript
      if (workers > 1) {
          ...
      } else {
          if (totalFrames > 0) {
              ...
          }
      }
```
If we hoist it, we check `totalFrames === 0` early and just resolve/return.

Wait, if `totalFrames === 0`, what does the system do? It just returns.
Let's add a fast-return at the top of `start()`:
```typescript
    if (totalFrames <= 0) return;
```
And then physically delete all the `if (totalFrames > 0) { ... }` wrappers deeper down in the file, unindenting their contents.

**Why**: Simplifies loop condition evaluation and removes redundant branch parsing across thousands of lines of AST.
**Risk**: None, functionally identical.

## Correctness Check
Run canvas/dom tests to ensure it correctly skips 0-frame renders.
