---
id: PERF-857
slug: chunked-progress-counter-multi-worker
status: unclaimed
claimed_by: ""
created: 2026-06-26
completed: ""
result: ""
---

# PERF-857: Replace Loop Branching with Chunked Inner Loops in CaptureLoop Multi-Worker Write Path

## Focus Area
`CaptureLoop.ts` multi-worker write loop progress logging paths and the `nextFrameToWrite < totalFrames` loop structure.

## Background Research
Currently, `CaptureLoop.ts` multi-worker write paths evaluate `if (nextFrameToWrite === nextProgress || nextFrameToWrite === totalFrames)` and loop bound `while (nextFrameToWrite < totalFrames && !aborted)` on every single frame iteration.
In PERF-856, chunked loops were planned for the single worker loops. Microbenchmarks evaluating the same transformation on multi-worker loops (a chunked `while` loop containing an unbranched `for` loop until the next progress interval) show significant microbenchmark improvements (~69% faster loop iteration, from ~1.14ms down to ~0.35ms for 1,000,000 iterations).

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom` (multi-worker path)
- **Metric**: Microbenchmark loop iteration time / Wall-clock render time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 engine evaluates branching logic (`if (nextFrameToWrite === nextProgress || nextFrameToWrite === totalFrames)`) inside the tightest inner write loop thousands of times.

## Implementation Spec

### Step 1: Refactor multi-worker write loops to chunked while loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker capture paths, replace the write loop structure:
```typescript
while (nextFrameToWrite < totalFrames && !aborted) {
    // ... wait for frameReadyRing ...
    // ... write to stream ...
    nextFrameToWrite++;
    if (freeWorkersHead > 0) checkState();
    if (!aborted && (nextFrameToWrite === nextProgress || nextFrameToWrite === totalFrames)) {
        if (nextFrameToWrite === nextProgress) nextProgress += progressInterval;
        // log progress
    }
}
```
with a chunked loop structure:
```typescript
while (nextFrameToWrite < totalFrames && !aborted) {
    let chunkEnd = nextFrameToWrite + progressInterval;
    if (chunkEnd > totalFrames) chunkEnd = totalFrames;

    for (; nextFrameToWrite < chunkEnd && !aborted; nextFrameToWrite++) {
        // ... wait for frameReadyRing ...
        // ... write to stream ...
        if (freeWorkersHead > 0) checkState();
    }

    if (aborted) break;

    // log progress for `nextFrameToWrite`
    console.log(`Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`);
    if (onProgress) onProgress(nextFrameToWrite / totalFrames);
}
```
*Note:* Also remove the manual `nextProgress` tracking variable, as `chunkEnd` effectively tracks the next progress checkpoint.
**Why**: Eliminates branch evaluations inside the tightest multi-worker writer loops.
**Risk**: Loop boundary off-by-one errors or early termination issues when `aborted` becomes true during the inner loop.

## Variations
Apply to all writer loop variations (isString and !isString).

## Correctness Check
Run the vitest test suite (`npx vitest run packages/renderer/`).
