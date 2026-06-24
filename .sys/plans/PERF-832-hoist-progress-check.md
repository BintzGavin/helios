---
id: PERF-832
slug: hoist-progress-check
status: complete
claimed_by: jules
created: 2024-06-24
completed: 2024-06-24
result: improved
---

# PERF-832: Hoist nextFrameToWrite Progress Check in Single-Worker Loop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast path (single-worker loop), specifically around the inner progress loops where we track `i` and `currentFrame`.

## Background Research
In PERF-822, we successfully hoisted the `i + 1 < totalFrames` check and other branches outside of the innermost capture loops, eliminating per-iteration branch evaluation and yielding a ~11% loop improvement.

However, in the single-worker capture loops, we currently increment a loop counter (`currentFrame`) and check `if (endFrame === totalFrames && !aborted)` at the end of each outer iteration, or similarly loop `i` over chunks.

Looking closely at the single worker fast path:
```typescript
let currentFrame = 1;
while (currentFrame < totalFrames) {
    if (aborted) break;
    const endFrame = Math.min(currentFrame + progressInterval, totalFrames);

    const prefetchEnd = endFrame === totalFrames ? endFrame - 1 : endFrame;
    for (let i = currentFrame; i < prefetchEnd; i++) {
        ...
    }
    if (endFrame === totalFrames && !aborted) {
        ... (duplicate final frame logic)
    }
    ...
```

The split logic for the final frame within chunked progress reporting (`endFrame === totalFrames ? endFrame - 1 : endFrame`) and the duplicate final-frame handling inside the string decode loop is a complex unswitching artifact that hurts instruction cache and branch prediction.

A better approach is to simply loop exactly over the frames:
```typescript
for (let i = 1; i < totalFrames; i++) {
    if (aborted) break;

    // Process frame i

    if (i % progressInterval === 0 || i === totalFrames - 1) {
        console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
        if (onProgress) {
            onProgress(i / totalFrames);
        }
    }
}
```
This entirely eliminates the `endFrame` math, the `prefetchEnd` ternary, and the duplicate inner loops. Microbenchmarks show that these cleaner loops perform identically (or slightly better due to instruction cache improvements) while significantly reducing code complexity and maintainability overhead.

We can apply this clean loop structure to both `hasProcessFn` true/false, and `isString` true/false single-worker paths.

## Implementation Spec

### Step 1: Simplify Single Worker Loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Rewrite the single-worker `while (currentFrame < totalFrames)` chunked loops into simple `for (let i = 1; i < totalFrames; i++)` loops.

Current structure:
```typescript
let currentFrame = 1;
while (currentFrame < totalFrames) {
    if (aborted) break;
    const endFrame = Math.min(currentFrame + progressInterval, totalFrames);
    const prefetchEnd = endFrame === totalFrames ? endFrame - 1 : endFrame;
    for (let i = currentFrame; i < prefetchEnd; i++) {
        // [CAPTURE & WRITE BLOCK]
    }
    if (endFrame === totalFrames && !aborted) {
        // [DUPLICATE FINAL FRAME CAPTURE & WRITE BLOCK]
    }
    currentFrame = endFrame;
    console.log(`Progress: Rendered ${currentFrame - 1} / ${totalFrames} frames`);
    if (onProgress) {
        onProgress((currentFrame - 1) / totalFrames);
    }
}
```

New structure:
```typescript
for (let i = 1; i < totalFrames; i++) {
    if (aborted) break;

    // [SINGLE CAPTURE & WRITE BLOCK]

    if (i % progressInterval === 0 || i === totalFrames - 1) {
        console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
        if (onProgress) {
            onProgress(i / totalFrames);
        }
    }
}
```
Apply this to:
- `if (isString)` branch inside `if (hasProcessFn)` (lines ~251-335)
- `else` branch inside `if (hasProcessFn)` (lines ~336-400)
- `if (isString)` branch inside `else` (no processFn) (lines ~460-524)
- `else` branch inside `else` (no processFn) (lines ~525-570)

## Canvas Smoke Test
Run `npx vitest run --passWithNoTests packages/renderer/` and the benchmark.

## Correctness Check
Run the DOM benchmark.
