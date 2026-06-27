---
id: PERF-860
slug: single-worker-chunked-loops
status: unclaimed
claimed_by: ""
created: 2024-06-27
completed: ""
result: ""
---
# PERF-860: Chunked Loops for Single-Worker Capture Paths

## Focus Area
The single-worker fast loops inside `CaptureLoop.ts` (`packages/renderer/src/core/CaptureLoop.ts`). These loops are currently structured as flat `for (let i = 1; i < totalFrames; i++)` loops with inner `if (i === nextProgress || i === totalFrames - 1)` branch evaluations on every single iteration.

## Background Research
Earlier experiments replaced modulo checks with simpler counter checks for progress reporting. However, evaluating `if (i === nextProgress)` on every frame still introduces branch overhead. PERF-859 recently applied chunked `while` loops to the multi-worker fast paths, which successfully removed the branch checks and yielded an ~11% microbenchmark improvement. We need to mirror this structural optimization in the single-worker capture loops, creating unbranched `for` loops inside outer chunk-managing `while` loops.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1080p, 60fps, 10s duration
- **Mode**: `dom` (single worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: CPU time spent evaluating branch conditions in V8 for every frame inside the tight capture loops.

## Implementation Spec

### Step 1: Replace Flat Loops with Chunked Loops in Single-Worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the 8 single-worker fast paths that use flat `for` loops with a chunked `while` loop structure that iterates up to `nextProgress` in an inner unbranched `for` loop, matching the multi-worker implementation pattern.
**Why**: By iterating over chunks without inner progress branches, we eliminate per-frame branch evaluation overhead in V8.
**Risk**: Off-by-one errors in frame capture counts or missing the final frame.

## Correctness Check
Run the DOM render benchmarks and unit tests to ensure that all frames are correctly generated and that progress is correctly logged.
