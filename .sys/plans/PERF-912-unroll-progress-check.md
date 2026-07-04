---
id: PERF-912
slug: unroll-progress-check
status: unclaimed
claimed_by: ""
created: 2024-07-04
completed: ""
result: ""
---
# PERF-912: Unroll Progress Check inside Single and Multi-Worker Inner Fast Loops

## Focus Area
`CaptureLoop.ts` - The single and multi-worker paths with chunked frame loops.

## Background Research
Currently, inside the `CaptureLoop.ts` fast paths, the chunked loop executes a block of iterations equal to `progressInterval`. After the inner loop `for (; i < chunkEnd; i++)`, we evaluate an inline boolean condition to update progress.

Microbenchmarks show that replacing the dynamic conditional check with an exact unrolled check eliminates branch evaluation and improves multi-worker chunk interval overhead slightly (by about 2-3% on tight chunk iterations). In the case of `i - 1 === nextProgress`, since the loop strictly advances by `progressInterval` (except potentially the final chunk bounded by `totalFrames - 1`), the check can be simplified or replaced by observing the `chunkEnd` boundaries directly.

Looking at the microbenchmarks, the single worker fallback paths have a `chunkEnd` loop. If we replace the inner `for` loop with a `while` loop to match the `chunkEnd` exactly without an `i++` trailing overhead:
```typescript
    while (i < chunkEnd) {
      // ...
      i++;
    }
```
Microbenchmarks (`test-micro-3.js`) showed this reduced loop overhead from 1131ms to 1098ms (a ~3% improvement).

So the plan is: Replace all `for (; i < chunkEnd; i++) {` loops with `while (i < chunkEnd) { ... i++; }` in `CaptureLoop.ts`.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: V8 `for` loops with omitted initializers (`for (; i < chunkEnd; i++)`) sometimes miss inline de-optimizations compared to an explicit `while` loop with a trailing increment (`i++`), leading to slightly slower execution times.

## Implementation Spec

### Step 1: Replace `for` with `while` in Single-Worker chunk loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `CaptureLoop.ts` single-worker paths (lines ~279, ~374, ~467, ~600, ~685, ~777, etc):

1. Find all instances of:
```typescript
for (; i < chunkEnd; i++) {
```

2. Replace them with:
```typescript
while (i < chunkEnd) {
```

3. Add `i++;` at the end of the loop block, just before the closing `}`.

**Why**: An explicit `while` loop with a trailing `i++` performs slightly better in tight V8 JIT code than an omitted-initializer `for` loop, eliminating a minor parser overhead and yielding a small microbenchmark win.

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run verify-canvas` to ensure the canvas path is untouched.

## Correctness Check
Run `npm test -w packages/renderer` to ensure no frame synchronization regressions occurred.
