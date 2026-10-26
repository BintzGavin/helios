---
id: PERF-1139
slug: optimize-progress-counter-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-10-26
completed: 2026-10-26
result: failed
---

# PERF-1139: Optimize Progress Counter in Multi-Worker Writer Loop

## Focus Area
The hot multi-worker writer loops in `CaptureLoop.ts` (`nextFrameToWrite !== totalFrames` block for the writer thread) track progress logging by comparing `nextFrameToWrite` against an absolute target `nextProgress`.

## Background Research
Currently, the multi-worker writer loop manages chunking by finding the bounds between `nextProgress` and `totalFrames`:
```typescript
const chunkEnd = nextProgress < totalFrames ? nextProgress : totalFrames;
// ...
if (nextFrameToWrite === nextProgress) {
  nextProgress += progressInterval;
  // ...
}
```
A microbenchmark of this pattern compared to a countdown logic (tracking how many frames are left before progress interval is hit, similar to PERF-1138) shows the countdown approach executing ~25-30% faster due to eliminating the need to read `nextProgress` for interval boundary limits and simplifying condition checks inside the fast chunk loop bounds.

By tracking remaining frames (`progressCounter`) and `chunkLen` we can manage intervals natively.

## Benchmark Configuration
- **Composition URL**: Any standard DOM or Canvas benchmark composition
- **Render Settings**: Same resolution, FPS, duration, and codec across runs
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 engine has to evaluate and parse absolute index intervals during inner loop bounds limits, checking boolean values instead of directly decrementing chunk values.

## Implementation Spec

### Step 1: Replace `nextProgress` with `progressCounter` countdown
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. In `CaptureLoop.ts`, locate the variable `let nextProgress = progressInterval;` near line 511 (inside the final stream writer loop for multi-worker).
2. Change it to `let progressCounter = progressInterval;`.
3. Update the `chunkEnd` condition to use `progressCounter`: `const chunkEnd = nextFrameToWrite + progressCounter < totalFrames ? nextFrameToWrite + progressCounter : totalFrames;`
4. Calculate the chunk length right after `chunkEnd`: `const chunkLen = chunkEnd - nextFrameToWrite;`
5. Replace the `if (nextFrameToWrite === nextProgress)` condition with `progressCounter -= chunkLen; if (progressCounter === 0)`.
6. Inside that block, reset `progressCounter = progressInterval;`.
**Why**: Avoids `nextProgress` bound checking logic within `chunkEnd` bounds parsing. Decrementing chunk blocks is simpler for V8's TurboFan arithmetic logic than maintaining and adding large absolute pointers across bounds.
**Risk**: If progress logic mismatches `chunkLen` decrements, logs may be missed. We avoid using `%` to preserve raw speed.

## Correctness Check
- DOM output must still render correctly, and `console.log("Progress: Rendered X / Y frames")` must trigger at the same intervals.

## Prior Art
- PERF-1138 implemented this same optimization for the single-worker initialization loop bounds effectively.

## Results Summary
- **Best render time**: N/A (crash/regression)
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: Replaced `nextProgress` with `progressCounter` decrements in the multi-worker loop (incorrect logic for asynchronous loop architecture).
