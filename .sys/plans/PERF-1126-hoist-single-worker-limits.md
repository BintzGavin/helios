---
id: PERF-1126
slug: hoist-single-worker-limits
status: complete
claimed_by: ""
created: 2024-10-22
completed: ""
result: ""
---
# PERF-1126: Hoist totalFrames limits in single-worker writer chunks of `CaptureLoop.ts`

## Focus Area
DOM rendering loop (`CaptureLoop.ts`). Target: V8 CPU overhead caused by repeated object property access and calculations.

## Background Research
In the multi-worker paths, we previously hoisted the `totalFrames` loop limit and pre-calculated `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth` to avoid per-iteration calculations and closure property reads.
In the single-worker `!hasProcessFn` path, the chunk loop uses `let i = 1; while (i < totalFrames - 1 && !aborted)`.
`totalFrames` is a closure-scoped property derived from options at the start of the `start()` function. While V8 is generally good at caching primitive closure variables, explicitly hoisting the loop boundary `totalFrames - 1` into a block-scoped `const loopEnd = totalFrames - 1;` forces the compiler to treat it as an immutable block-local constant rather than verifying the closure value hasn't changed per iteration. This marginally speeds up the branch evaluation of the `while` loop condition.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1080p, 60fps, fixed duration.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: Micro-optimizing AST execution bounds inside hot single-worker frame iterators.

## Implementation Spec

### Step 1: Precalculate loop limits
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Before the single worker chunk loop (`let i = 1; while (i < totalFrames - 1 && !aborted)`):
Add:
`const loopEnd = totalFrames - 1;`
And replace the loop condition:
`while (i < loopEnd && !aborted)`

Apply this to the other single-worker chunk loops as well (e.g., `let i = 0; while (i < chunkEnd)`) if `chunkEnd` involves recalculations. Wait, `chunkEnd` is already precalculated. So specifically target the `totalFrames - 1` evaluations.

**Why**: Simplifies loop condition evaluation by removing mathematical subtraction and closure resolution.
**Risk**: None.

## Correctness Check
Run canvas/dom tests to ensure boundaries are correctly respected.

## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	8.694	150	17.25	63.8	keep	baseline
2	8.709	150	17.22	63.9	keep	baseline
3	8.731	150	17.18	63.9	keep	baseline
4	8.678	150	17.28	64.0	keep	hoisted limits
5	8.691	150	17.26	63.9	keep	hoisted limits
6	8.703	150	17.23	64.2	keep	hoisted limits
```
