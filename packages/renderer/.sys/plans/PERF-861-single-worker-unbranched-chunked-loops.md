---
id: PERF-861
slug: single-worker-unbranched-chunked-loops
status: unclaimed
claimed_by: ""
created: 2024-06-27
completed: ""
result: ""
---

# PERF-861: Unbranched Chunked Loops in CaptureLoop Single Worker Path

## Focus Area
`CaptureLoop.ts` single-worker capture loops, replacing fast counters and peeled branches with unbranched chunked while/for loops.

## Background Research
Earlier attempts (PERF-849, PERF-860) to optimize the single-worker capture loops tried peeling the final frame iteration to avoid the per-iteration `if (i < totalFrames - 1)` check. However, microbenchmarks demonstrated that peeling this logic into complex chunked loops (like in PERF-860) degraded performance due to V8 deoptimization or code duplication.

However, if we remove the inner `if (i < totalFrames - 1)` logic completely from the inner loop, and just run a straight, unbranched `for` loop within the chunk, it outperforms the current Fast Counter implementation (4.430 ms vs 4.798 ms in microbenchmarks).

To do this correctly without breaking functionality, we need to adapt the single-worker logic to evaluate the "final frame" condition outside the tight loop, or accept that the final frame will also trigger `timeDriver.setTime()` and `domBeginFrame()`, which is technically harmless because we discard the result after the loop completes anyway. By making the inner chunked `for` loop entirely unbranched, we achieve maximum V8 optimization.

## Benchmark Configuration
- **Mode**: `dom`

## Baseline
- **Bottleneck analysis**: The V8 engine evaluates branching logic inside the tightest single-worker capture loop.

## Implementation Spec

### Step 1: Refactor single-worker loops to use unbranched chunked progress
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Refactor the single-worker capture loops. For each loop, the current structure:

```typescript
                for (let i = 1; i < totalFrames; i++) {
                  if (aborted) break;

                  if (i < totalFrames - 1) {
                     // standard capture
                  } else {
                     // final frame capture
                  }

                  if (i === nextProgress || i === totalFrames - 1) {
                     // progress reporting
                  }
                }
```

Should be transformed into a chunked while loop where the inner `for` loop is unbranched. To do this, we can pull the final frame logic out of the `for` loop entirely, or we can just run the standard capture logic for the final frame as well (which executes an extra `setTime` but avoids code duplication, and the extra `setTime` is harmless as the loop ends).

However, since we want to be exact, we should process up to `totalFrames - 1` in the chunked loop, and then manually process the very last frame (`totalFrames - 1`) outside the `while` loop entirely.

Conceptual structure:

```typescript
let i = 1;
while (i < totalFrames - 1 && !aborted) {
  let chunkEnd = i + progressInterval;
  if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;

  for (; i < chunkEnd && !aborted; i++) {
    // standard capture logic (the old 'if' block)
  }

  if (aborted) break;

  if (i - 1 === nextProgress || i === totalFrames - 1) {
    if (i - 1 === nextProgress) nextProgress += progressInterval;
    console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
    if (onProgress) {
      onProgress((i - 1) / totalFrames);
    }
  }
}

if (!aborted && totalFrames > 1) {
  // Process the very last frame (the old 'else' block)
  // ... final frame capture logic ...

  i++;
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

**Why**: Eliminates branch evaluations inside the tightest single-worker capture loops, allowing V8 to optimize the inner loop fully.
**Risk**: Loop boundary off-by-one errors.

## Variations
None.

## Canvas Smoke Test
Run a basic Canvas smoke test to ensure shared pipeline code isn't broken.

## Correctness Check
Run the vitest test suite (`npx vitest run packages/renderer/`).
