---
status: unclaimed
---

# Plan: Pre-calculate `startFrame + 1` to reduce additions in `CaptureLoop.ts`

## Objective
Reduce addition operations in the multi-worker loop by hoisting `startFrame + 1` to a constant `startFramePlusOne`.

## Rationale
In the `CaptureLoop.ts` multi-worker fast path, the loop evaluates `(startFrame + i + 1) * compTimeStep`. While we could replace it entirely with a running sum (PERF-872), an alternative or complementary approach is pre-calculating the static parts `const startFramePlusOne = startFrame + 1;` and then doing `(startFramePlusOne + i) * compTimeStep`. This eliminates an addition operation per iteration.

## Steps
1. In `CaptureLoop.ts` multi-worker `isDomStrategy` paths, declare `const startFramePlusOne = startFrame + 1;` outside the loops.
2. Inside the loop, change `(startFrame + i + 1)` to `(startFramePlusOne + i)`.
3. Test and benchmark.
4. Record results.
