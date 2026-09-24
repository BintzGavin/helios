---
id: PERF-867
slug: fast-drain-check
status: complete
claimed_by: ""
created: 2026-06-28
completed: "2026-06-28"
result: "discarded"
---

# PERF-867: Fast Drain Check Optimization

## Focus Area
The `CaptureLoop.ts` file in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The loop checks `if (!writeSuccess && pendingBytes >= 16777216)` to see if we need to drain. Microbenchmarking `pendingBytes >= 16777216 && !writeSuccess` to see if short-circuiting on the numeric check rather than the boolean check provides a performance boost.

## Benchmark Configuration
- **Composition URL**: N/A
- **Render Settings**: N/A
- **Metric**: Microbenchmark execution time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A

## Implementation Spec

### Step 1: Microbenchmark
Write a quick microbenchmark script.

## Correctness Check
If discarded, do not proceed.
