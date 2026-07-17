---
id: PERF-1029
slug: unroll-isdomstrategy-single-worker-noprocessfn-initial
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1029: Unroll isDomStrategy in single worker !hasProcessFn initial block

## Focus Area
The single-worker !hasProcessFn initial frame setup logic in CaptureLoop.ts.

## Background Research
The CaptureLoop.ts file contains the core rendering loop. Previous experiments unrolled isDomStrategy checks in the inner chunk loops (PERF-1025, PERF-1028). However, the initial frame logic still evaluates isDomStrategy repeatedly. Unrolling the entire !hasProcessFn block eliminates these checks.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `canvas` and `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The redundant branch evaluation overhead for logically guaranteed checks.

## Implementation Spec

### Step 1: Hoist isDomStrategy check
**File**: packages/renderer/src/core/CaptureLoop.ts
**What to change**: In the single-worker `!hasProcessFn` else block, wrap the entire contents in `if (isDomStrategy) { ... } else { ... }`.
**Why**: Eliminates branch parser instructions and polymorphic checks for the single-worker `!hasProcessFn` path.

## Variations
No variations.

## Canvas Smoke Test
Run `npm run build -w packages/core && npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to verify the Canvas path.

## Correctness Check
Run `npm run build -w packages/core && npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify the DOM path.

## Prior Art
Prior optimizations like PERF-1025 and PERF-1028 successfully eliminated branch evaluation overhead by unrolling `isDomStrategy` loops.
