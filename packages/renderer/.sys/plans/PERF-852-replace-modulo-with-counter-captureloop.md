---
id: PERF-852
slug: replace-modulo-with-counter-captureloop
status: unclaimed
claimed_by: ""
created: 2024-06-25
completed: ""
result: ""
---

# PERF-852: Replace Modulo Progress Check with Fast Counter in CaptureLoop

## Focus Area
The single-worker hot paths in `CaptureLoop.ts` evaluate `i % progressInterval === 0` inside the tightest inner loops.

## Background Research
Modulo arithmetic (`%`) is computationally expensive in V8 compared to simple integer addition and equality checks. The progress logging code executes every frame inside the inner fast loops. By substituting the modulo check with a counter variable initialized outside the loop, we eliminate the costly division operation per frame. In high-throughput microbenchmarks, eliminating modulo operations in hot loops can significantly reduce CPU overhead and improve V8 pipeline execution.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Microbenchmark loop iteration time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The modulo division operation requires multiple CPU cycles. It happens on every frame in the tightly optimized V8 fast paths. Testing shows integer addition and equality checks are faster.

## Implementation Spec

### Step 1: Replace modulo with counter in single-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, immediately before the first `for` loop, initialize:
`let nextProgress = progressInterval;`
Then, inside the inner `for` loops, replace:
`if (i % progressInterval === 0 || i === totalFrames - 1) {`
with:
`if (i === nextProgress || i === totalFrames - 1) {`
and inside the if-block, add:
`if (i === nextProgress) nextProgress += progressInterval;`

## Variations
None.

## Correctness Check
Run the vitest test suite (`npx vitest run --passWithNoTests packages/renderer/`).
