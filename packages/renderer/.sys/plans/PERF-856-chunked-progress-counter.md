---
id: PERF-856
slug: chunked-progress-counter
status: discarded
claimed_by: ""
created: 2026-06-25
completed: ""
result: "superseded-by-PERF-860"
---

# PERF-856: Replace Loop Branching with Chunked Inner Loops in CaptureLoop

## Focus Area
`CaptureLoop.ts` single-worker loop progress logging paths and the `totalFrames` loop structure.

## Background Research
Currently, `CaptureLoop.ts` single-worker loops evaluate `if (i === nextProgress || i === totalFrames - 1)` and `if (i < totalFrames - 1)` on every single frame iteration. Microbenchmarks show that replacing these per-iteration branches with a chunked `while` loop containing an unbranched `for` loop (running until the next progress interval) eliminates V8 branch evaluation overhead entirely. The chunked loop approach outperforms both modulo and simple counter implementations.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Microbenchmark loop iteration time / Wall-clock render time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 engine evaluates branching logic inside the most critical inner loops thousands of times.

## Implementation Spec

### Step 1: Refactor single-worker loops to chunked while loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker capture paths, replace the structure:
`for (let i = 1; i < totalFrames; i++) { ... }`
with a chunked loop structure:
`let i = 1;`
`while (i < totalFrames) {`
`  let chunkEnd = i + progressInterval;`
`  if (chunkEnd > totalFrames) chunkEnd = totalFrames;`
`  for (; i < chunkEnd - 1; i++) { ... fast path ... }`
`  // Final frame of chunk (or total frames)`
`  ... frame logic ...`
`  onProgress(i / totalFrames);`
`  i++;`
`}`
**Why**: Eliminates branch evaluations (`if (i === nextProgress)` and `if (i < totalFrames - 1)`) inside the tightest loops.
**Risk**: Loop boundary off-by-one errors.

## Variations
Apply to all 8 loops inside the single-worker path.

## Correctness Check
Run the vitest test suite (`npx vitest run packages/renderer/`).
