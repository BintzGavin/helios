---
id: PERF-835
slug: hoist-progress-check-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-06-24
completed: ""
result: ""
---

# PERF-835: Hoist nextFrameToWrite Progress Check in Multi-Worker Loop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast path (multi-worker loop) inside the final frame assembly and writing logic block.

## Background Research
In PERF-822 and PERF-832, we successfully hoisted branch checks outside of the single-worker capture loops, yielding substantial execution time improvements. We applied a similar approach to unswitch and hoist inner branches in the single-worker write loop.

However, in the multi-worker path (`if (poolLen === 1) { ... } else { ... }`), the write logic inside the `try` block that pulls from the `frameBufferRing` still contains complex, chunked loops for progress reporting.
```typescript
while (nextFrameToWrite < totalFrames && !aborted) {
    if (freeWorkersHead > 0 || capturedErrors.length > 0 || (signal && signal.aborted)) {
        checkState();
    }
    if (aborted) break;

    let currentFrame = nextFrameToWrite;
    const endFrame = Math.min(currentFrame + progressInterval, totalFrames);

    while (nextFrameToWrite < endFrame) {
        if (aborted) break;
        // Wait and write logic...
    }

    if (!aborted && nextFrameToWrite % progressInterval === 0) {
         console.log(`Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`);
         if (onProgress) onProgress(nextFrameToWrite / totalFrames);
    }
}
```
This requires an inner `while (nextFrameToWrite < endFrame)` loop inside an outer `while (nextFrameToWrite < totalFrames)` loop, calculating `endFrame` in every outer iteration. This causes branch prediction misses and creates unnecessary scoping complexity.

By flattening this into a single `while (nextFrameToWrite < totalFrames)` loop, we can eliminate the `endFrame` calculation and reduce overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds

## Implementation Spec

### Step 1: Simplify Multi-Worker Write Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Rewrite the chunked multi-worker write loops in the `isString === true` and `isString === false` branches into simple, flat `while (nextFrameToWrite < totalFrames)` loops.

Current structure:
```typescript
while (nextFrameToWrite < totalFrames && !aborted) {
    // state checks
    let currentFrame = nextFrameToWrite;
    const endFrame = Math.min(currentFrame + progressInterval, totalFrames);
    while (nextFrameToWrite < endFrame) {
        // [WAIT & WRITE BLOCK]
        nextFrameToWrite++;
    }
    if (!aborted && nextFrameToWrite % progressInterval === 0) {
         // [PROGRESS LOGGING]
    }
}
```

New structure:
```typescript
while (nextFrameToWrite < totalFrames && !aborted) {
    if (freeWorkersHead > 0 || capturedErrors.length > 0 || (signal && signal.aborted)) {
        checkState();
    }
    if (aborted) break;

    // [WAIT & WRITE BLOCK]

    nextFrameToWrite++;

    if (!aborted && (nextFrameToWrite % progressInterval === 0 || nextFrameToWrite === totalFrames)) {
        console.log(`Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`);
        if (onProgress) onProgress(nextFrameToWrite / totalFrames);
    }
}
```

Apply this to:
- The `if (!aborted && isString)` block.
- The `else if (!aborted)` block.

## Canvas Smoke Test
Run `npx vitest run --passWithNoTests packages/renderer/` to ensure no syntactical errors.

## Correctness Check
Run the DOM benchmark. Ensure that no frames are skipped, writing logic still works correctly, and progress is still properly logged every `progressInterval` (and on the last frame).
