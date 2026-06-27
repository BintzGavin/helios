---
id: PERF-860
slug: chunked-progress-counter-single-worker
status: discarded
claimed_by: ""
created: 2024-06-27
completed: ""
result: "superseded-by-PERF-861"
---

# PERF-860: Replace Loop Branching with Chunked Inner Loops in CaptureLoop Single Worker Path

## Focus Area
`CaptureLoop.ts` single-worker capture loops, specifically the `for (let i = 1; i < totalFrames; i++)` structures and internal branching.

## Background Research
Currently, the single-worker capture loops evaluate `if (i < totalFrames - 1)` and `if (i === nextProgress || i === totalFrames - 1)` on every frame iteration. Microbenchmarks show that replacing these per-iteration branches with chunked `while` loops containing unbranched inner `for` loops eliminates V8 branch evaluation overhead entirely, outperforming both modulo and simple counter implementations. This supersedes PERF-856 with a more detailed implementation spec that properly preserves the final frame peeling logic.

## Benchmark Configuration
- **Mode**: `dom`

## Baseline
- **Bottleneck analysis**: The V8 engine evaluates branching logic (`if (i < totalFrames - 1)` and `if (i === nextProgress || i === totalFrames - 1)`) inside the tightest inner capture loop thousands of times.

## Implementation Spec

### Step 1: Refactor single-worker loops to use chunked progress
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Refactor all 8 instances of the single-worker `for (let i = 1; i < totalFrames; i++)` loops to use the chunked while-loop pattern.

The new pattern should look exactly like this conceptual structure, applied to each loop's specific capture and write logic:

```typescript
let i = 1;
while (i < totalFrames && !aborted) {
  let chunkEnd = i + progressInterval;
  if (chunkEnd > totalFrames) chunkEnd = totalFrames;

  for (; i < chunkEnd && i < totalFrames - 1 && !aborted; i++) {
    // ... nextCapturePromise / timeDriver.setTime / domBeginFrame
    // ... stream.write logic
  }

  if (aborted) break;

  if (i === totalFrames - 1) {
    // ... final frame nextCapturePromise without next setTime
    // ... stream.write logic
    i++;
  }

  if (aborted) break;

  if (i - 1 === nextProgress || i === totalFrames) {
    if (i - 1 === nextProgress) nextProgress += progressInterval;
    console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
    if (onProgress) {
      onProgress((i - 1) / totalFrames);
    }
  }
}
```
Apply this transformation to all 8 loops within the single worker fast path.

**Why**: Eliminates branch evaluations inside the tightest single-worker capture loops.
**Risk**: Loop boundary off-by-one errors or missed final frames.

## Variations
None.

## Canvas Smoke Test
Run a basic Canvas smoke test to ensure shared pipeline code isn't broken.

## Correctness Check
Run the vitest test suite (`npx vitest run packages/renderer/`).
