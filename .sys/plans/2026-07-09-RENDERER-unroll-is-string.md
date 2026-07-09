---
id: PERF-950
slug: unroll-is-string
status: unclaimed
claimed_by: ""
created: 2026-07-09
completed: ""
result: ""
---

# PERF-950: Unroll isString dynamically evaluated check in single worker (Missing PERF-942 Execution)

## Focus Area
The dynamically evaluated `typeof` check inside the single-worker capture loops (`isString = isDomStrategy || typeof buffer === "string"`) in `packages/renderer/src/core/CaptureLoop.ts` around lines 244 and 523. This is exactly what was proposed in PERF-942, but examining the codebase reveals that PERF-942 was never actually implemented in `CaptureLoop.ts` (lines 244 and 523 still contain `isString = isDomStrategy || typeof buffer === "string";`). Therefore, we need to actually execute the planned unrolling.

## Background Research
Similar unroll optimizations have proven successful (e.g., PERF-942 and multi-worker loops) by replacing dynamic type checks with a priori known boolean variables like `isDomStrategy` or `isDomStrategyWriter`.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Hot loops inside single-worker paths evaluate dynamic `typeof buffer === "string"` checks, contributing to V8 dynamic checking overhead on every frame captured.

## Implementation Spec

### Step 1: Replace `typeof` check in CaptureLoop.ts finish logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker capture loops around line 244 and 523, replace `isString = isDomStrategy || typeof buffer === "string";` with simply relying on `isDomStrategy` (or unswitching the `isDomStrategy` paths vs buffer logic). This removes a dynamically evaluated `typeof` check on every single frame captured, allowing V8 TurboFan to optimize and inline the write calls better since it relies on a boolean known upfront before the hot loops. NOTE: this implements the previously planned but missing PERF-942 optimization.

## Variations
None.

## Correctness Check
Run tests to ensure it passes.
