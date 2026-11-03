---
id: PERF-1169
slug: inline-dispatch-workers
status: unclaimed
claimed_by: ""
created: 2024-11-03
completed: ""
result: ""
---

# PERF-1169: Inline dispatchWorkers to Reduce Closure Invocation Overhead

## Focus Area
The multi-worker loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the `dispatchWorkers` closure and its invocations within the writer's loop and `checkState`.

## Background Research
Currently, `dispatchWorkers` is a closure invoked inside the main writer loop and within `checkState`. Every invocation of a closure (especially one modifying outer block variables) incurs overhead in V8 (AST size, function setup, context retrieval).
By inlining the logic of `dispatchWorkers` directly into the hot writer loop and `checkState`, we can eliminate the closure invocation overhead. This leverages V8's ability to better optimize standard block-level code, removing branching and function calls from the hot path. Similar prior art shows that reducing closure overhead in hot loops (e.g. unrolling, hoisting, and inlining closures) directly correlates with improved execution speed and reduced V8 compilation complexity.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The function `dispatchWorkers` is called at least once per chunk in the main loop, plus asynchronously via `checkState` if aborts occur. The overhead of calling the closure and capturing outer state (like `freeWorkersHead`, `nextFrameToWrite`, `totalFrames`) limits the JIT's ability to pipeline the loop effectively.

## Implementation Spec

### Step 1: Inline `dispatchWorkers` logic in `checkState`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the call to `dispatchWorkers()` inside `checkState` with the actual logic of `dispatchWorkers`.

**Why**: Removes the closure invocation overhead when `checkState` is called.
**Risk**: Minimal, as the logic is identical.

### Step 2: Inline `dispatchWorkers` logic in the main writer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the call to `dispatchWorkers()` inside the main writer loop with the actual logic of `dispatchWorkers`.
Remove the `dispatchWorkers` function definition entirely.

**Why**: Removes the closure invocation overhead in the most critical loop of the multi-worker path. This shrinks the AST and improves block optimization by V8.
**Risk**: Code duplication (logic appears twice), but the performance gain in the hot path justifies the minor repetition.

## Canvas Smoke Test
Run a standard Canvas-based render to ensure no regressions occur in the multi-worker path logic (which is shared in structure for worker coordination).

## Correctness Check
Ensure DOM output is correct by visually inspecting the resulting video/frames or verifying integration test suite passes.

## Prior Art
- PERF-929: Hoisted loop-carried induction variables (`freeWorkersHead` and `nextFrameToSubmit`) in `CaptureLoop.ts` multi-worker dispatch loops.
- PERF-931: Hoisted free worker dispatch logic (`if (freeWorkersHead > 0)`) in multi-worker writer chunk loops to execute *before* the inner wait loop (`await writerWaiterPromise`).
- General optimizations in JS engine land favor inlining small, highly-called closures to reduce call stack and context overhead.
