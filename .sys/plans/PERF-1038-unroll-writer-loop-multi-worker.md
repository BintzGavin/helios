---
id: PERF-1038
slug: unroll-writer-loop-multi-worker
status: complete
claimed_by: "executor"
created: 2026-07-20
completed: ""
result: "improved"
---

# PERF-1038: Isolate multi-worker DOM and Canvas writer loops completely

## Focus Area
The multi-worker frame rendering main chunk writer loop in `packages/renderer/src/core/CaptureLoop.ts` (around lines 580-730).

## Background Research
In the multi-worker paths, `CaptureLoop.ts` has a top-level `isDomStrategyWriter` check inside the writer routine. However, the outer block `if (nextFrameToWrite < totalFrames && !aborted)` wraps the check:
```typescript
        if (nextFrameToWrite < totalFrames && !aborted) {
          if (isDomStrategyWriter) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
...
```
Currently, `isDomStrategyWriter` check is already largely hoisted out of the main loop because it's wrapped outside the two `while` loops (one for `isDomStrategyWriter`, one for `!isDomStrategyWriter`). We can completely unroll this outer block so that V8 sees two distinct, self-contained outer evaluation paths, separating the `if (nextFrameToWrite < totalFrames && !aborted)` into the two branches:

```typescript
        let nextProgress = progressInterval;
        if (isDomStrategyWriter) {
          if (nextFrameToWrite < totalFrames && !aborted) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              // ...
            }
          }
        } else {
          if (nextFrameToWrite < totalFrames && !aborted) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              // ...
            }
          }
        }
```

This prevents TurboFan from creating a shared AST block for the outer condition that then immediately branches on a strategy check. It isolates the AST blocks perfectly for `isDomStrategyWriter`.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: By strictly hoisting the constant `isDomStrategyWriter` check to the top level outside of the `if (nextFrameToWrite < totalFrames && !aborted)` block, we can achieve perfect AST isolation for V8 TurboFan compilation on the two worker strategies.

## Implementation Spec

### Step 1: Hoist `isDomStrategyWriter` outside the outer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer logic (around lines 585-588), hoist the `if (isDomStrategyWriter)` up to wrap the entire `if (nextFrameToWrite < totalFrames && !aborted)` loop block.
```typescript
<<<<<<< SEARCH
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          if (isDomStrategyWriter) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
=======
        let nextProgress = progressInterval;
        if (isDomStrategyWriter) {
          if (nextFrameToWrite < totalFrames && !aborted) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
>>>>>>> REPLACE
```

In the middle (around line 656):
```typescript
<<<<<<< SEARCH
              }
            }
          } else {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
=======
              }
            }
          }
        } else {
          if (nextFrameToWrite < totalFrames && !aborted) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
>>>>>>> REPLACE
```

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to verify canvas smoke tests pass.

## Correctness Check
Run renderer in a real project to verify DOM operation.
