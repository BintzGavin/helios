---
id: PERF-882
slug: unroll-is-string-multi-worker
status: unclaimed
claimed_by: ""
created: 2025-02-12
completed: ""
result: ""
---

# PERF-882: Unroll isString in Multi-Worker Capture Loops

## Focus Area
The multi-worker write loops in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, eliminating the per-iteration `typeof buffer === "string"` check since the type of buffer is known a priori based on the strategy type (`isDomStrategy` or canvas strategy).

## Background Research
In `CaptureLoop.ts`, the multi-worker path uses a ring buffer to store incoming frames from workers, and a main thread writer loop pulls them out and pipes them to FFmpeg. Currently, the inner loop dynamically evaluates `isString = typeof buffer === "string";` on every frame to decide if base64 decoding is needed.

Since we already distinguish the strategies (e.g., via `isDomStrategy`), we know statically whether a strategy produces base64 strings or direct memory buffers. By unrolling/unswitching this branch out of the hot inner write loops, we can eliminate per-frame type evaluation and branching overhead.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom` (with multiple workers)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: V8 dynamic type checking and branching (`typeof buffer === "string"`) inside the multi-worker hot write loop.
- **Microbenchmark results**: A mock script simulating the ring buffer drain showed a ~34% improvement in loop execution time (from ~4.09ms to ~2.68ms median) when unrolling the `isString` branch evaluation.

## Implementation Spec

### Step 1: Hoist `isString` evaluation in multi-worker `hasProcessFn = true` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `if (hasProcessFn)` block in the multi-worker loop, locate the ring buffer drain loop:
```typescript
            isString = typeof buffer === "string";

            let writeSuccess = false;
            if (isString) {
```
Instead of dynamically checking `typeof buffer`, use the already available `isDomStrategy` or a hoisted static type flag to split the loops or simply assume the type based on the strategy setup block. We can unswitch the loop into two distinct `while (!aborted)` loops based on the strategy type.
**Why**: Eliminates per-iteration branching and type checking.

### Step 2: Hoist `isString` evaluation in multi-worker `hasProcessFn = false` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Similarly, inside the `if (!hasProcessFn)` block, unswitch the inner writer loop into two versions based on the strategy type.
**Why**: Extends the same optimization to the other multi-worker fast path.

## Variations
- **Variation A**: Instead of unswitching the entire loop, initialize `let isString = isDomStrategy;` before the loop and use that constant within the loop to avoid the `typeof` evaluation, though V8 might still need to evaluate the `if (isString)` branch.

## Canvas Smoke Test
Run `npm test -w packages/renderer` to ensure canvas streams still write correctly.

## Correctness Check
Run `npm test -w packages/renderer` to ensure DOM base64 output still decodes correctly.
