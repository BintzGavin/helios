---
id: PERF-1105
slug: unroll-single-worker-loops
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---
# PERF-1105: Unroll Single-Worker Frame Loops in CaptureLoop.ts

## Focus Area
The single-worker capture path in `CaptureLoop.ts` (Phase 4: Frame Capture Loop). This experiment aims to reduce AST complexity and V8 branch prediction overhead by completely separating the `dom` and `canvas` main frame capture loops, eliminating the repeated per-frame `isDomStrategy` evaluations inside the tight loops.

## Background Research
PERF-1104 successfully isolated the initialization of single-worker rendering into separate `dom` and `canvas` paths, yielding performance benefits due to reduced branch evaluation overhead. However, the main frame loop (`let i = 1; while (...)`) and the final frame completion block (`if (!aborted && totalFrames > 1)`) still contain interleaved paths with runtime checks like `if (isDomStrategy)`. In a hot loop executing thousands of times per second, removing these branches allows the V8 TurboFan compiler to optimize the loop body more aggressively without polymorphic or branch-heavy AST logic.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Baseline from RENDERER-EXPERIMENTS.md
- **Bottleneck analysis**: The `while` loop processes frames sequentially. Inside this loop, `if (isDomStrategy)` is evaluated up to `totalFrames` times. This forces the JS engine to parse larger ASTs and maintain branches that are invariant for the duration of the loop.

## Implementation Spec

### Step 1: Wrap single-worker loop blocks in a top-level `if (isDomStrategy)`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the block of code starting with `let i = 1;` and continuing through the `while (i < totalFrames - 1 && !aborted)` loop and the subsequent `if (!aborted && totalFrames > 1)` final frame processing logic.

Currently, this block is a single monolithic block with inner `if (isDomStrategy)` conditionals. You must refactor this into:
```typescript
if (isDomStrategy) {
  let i = 1;
  while (i < totalFrames - 1 && !aborted) {
    // ... dom loop body (remove inner isDomStrategy checks and canvas branches)
  }
  if (!aborted && totalFrames > 1) {
    // ... dom final frame processing
  }
} else {
  let i = 1;
  while (i < totalFrames - 1 && !aborted) {
    // ... canvas loop body (remove inner isDomStrategy checks and dom branches)
  }
  if (!aborted && totalFrames > 1) {
    // ... canvas final frame processing
  }
}
```

**Why**: By hoisting the `isDomStrategy` check completely out of the frame capture loop, the JS engine executes a monolithic loop tailored specifically for the active strategy. This reduces the number of instructions executed per frame and minimizes AST branch points.
**Risk**: If variables like `i` or `pendingBytes` are incorrectly scoped or updated, it may lead to frame loss or stream backpressure issues.

## Variations
### Variation A: Inline domBeginFrame
If `domBeginFrame` logic is simple enough, it could be inlined further inside the unrolled loop to eliminate the function call overhead.

## Canvas Smoke Test
Run `npm run benchmark-perf --mode=canvas` to ensure the canvas path hasn't been broken by unrolling the logic.

## Correctness Check
Run the DOM test suite to verify that the final frame buffer logic and progress reporting still behave identically.

## Prior Art
- PERF-1104: Isolated `isDomStrategy` for initialization block.
- PERF-1041: Isolated multi-worker writer loops based on strategy.
