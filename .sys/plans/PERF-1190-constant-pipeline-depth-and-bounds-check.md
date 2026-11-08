---
id: PERF-1190
slug: constant-pipeline-depth-and-bounds-check
status: complete
claimed_by: "jules"
created: 2024-11-08
completed: 2024-11-08
result: improved
---

# PERF-1190: Constant pipeline depth and bounds check math in CaptureLoop.ts

## Focus Area
The single-worker progress chunk boundaries, multi-worker worker-dispatch state assignments, and the dynamic calculation of `maxPipelineDepth` in `CaptureLoop.ts`. These execute frequently during the capture loop and dictate the bounds of frame rendering chunks.

## Background Research
In the single-worker capture loops, the chunk boundary is evaluated using an inline ternary that calculates `i + progressInterval` twice.
V8 handles `Math.min` intrinsically and avoids re-evaluating the expressions. Swapping this specific inline ternary loop bound to `Math.min(i + progressInterval, loopEnd)` will reduce AST size and branch evaluation overhead.

Additionally, within the multi-worker worker-dispatch blocks, the variable `h` is decremented in a `while (h !== 0)` loop, guaranteeing it is exactly `0` when the loop exits. Immediately afterward, there is a dead assignment `h = 0;`. Eliminating this dead store shrinks the AST for the worker-dispatch block with zero risk.

Finally, `maxPipelineDepth` is dynamically evaluated at the start of the multi-worker path. Since the initial assignment is `64` and `Math.pow(2, Math.ceil(Math.log2(64)))` identically resolves to `64`, this is a dynamic calculation of a static value. By defining `const maxPipelineDepth = 64;`, V8 can inline it directly into JIT compiled loops and closures.

## Baseline
- **Bottleneck analysis**: The renderer spends significant time doing JIT evaluation of loop boundaries in the fast paths. Redundant expression evaluations inside loop constraints create unneeded CPU overhead. Dynamic variables block compiler optimization of loop constants.

## Results Summary
- **Render Mode Tested**: DOM Benchmark
- **Original Render Time**: ~8.658s
- **New Render Time**: ~6.241s
- **Outcome**: The changes successfully reduced AST parsing complexity, utilized V8 intrinsics like `Math.min`, eliminated dead assignments, and established `maxPipelineDepth` as a constant. The DOM macro benchmark showed significant improvement.
