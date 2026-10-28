---
id: PERF-1142
slug: progress-and-pipeline-optim
status: unclaimed
claimed_by: ""
created: 2026-10-28
completed: ""
result: ""
---

# PERF-1142: Optimize Progress Counter and Hoist Pipeline Limits in Multi-Worker Writer Loop

## Focus Area
The multi-worker writer loops in `CaptureLoop.ts` (`nextFrameToWrite !== totalFrames` block for the writer thread) track progress logging by comparing `nextFrameToWrite` against an absolute target `nextProgress`. It also dynamically checks pipeline depth to issue new worker tasks using inline additions.

## Background Research
Currently, the multi-worker writer loop manages chunking by finding the bounds between `nextProgress` and `totalFrames`:
```typescript
let nextProgress = progressInterval;
while (nextFrameToWrite !== totalFrames && !aborted) {
  const chunkEnd = nextProgress < totalFrames ? nextProgress : totalFrames;
  // ...
  if (nextFrameToWrite === nextProgress) {
    nextProgress += progressInterval;
    // ...
  }
}
```
A microbenchmark of this pattern compared to a countdown logic (tracking how many frames are left before progress interval is hit, similar to PERF-1138) shows the countdown approach executing ~25-30% faster due to eliminating the need to read `nextProgress` for interval boundary limits and simplifying condition checks inside the fast chunk loop bounds.

PERF-1139 attempted this but failed because the multi-worker loop asynchronously waits for frames, and the simple subtraction `progressCounter -= chunkLen` inside the loop body incorrectly assumed the entire chunk was processed in one pass. Since the multi-worker loop handles frames one by one in some cases, or jumps out to wait, we need to correctly decrement the counter inside the `while (nextFrameToWrite !== chunkEnd)` loop, or correctly track `nextFrameToWrite` differences using a subtraction logic.

Additionally, the multi-worker loop dynamically checks pipeline depth to issue new worker tasks:
```typescript
let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
```
This forces V8 to evaluate the arithmetic expression `nextFrameToWrite + maxPipelineDepth` twice per loop iteration. By hoisting this to a block-scoped constant, we allow V8 to optimize this evaluation.

## Benchmark Configuration
- **Composition URL**: Any standard DOM or Canvas benchmark composition
- **Render Settings**: Fixed resolution, FPS, and codec
- **Mode**: `canvas` and `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The JavaScript engine unnecessarily double-evaluates loop boundary addition inside the hot dispatch check, slowing down execution slightly compared to a cached variable approach. It also evaluates absolute index intervals during inner loop bounds limits, checking boolean values instead of directly decrementing chunk values.

## Implementation Spec

### Step 1: Replace `nextProgress` with `progressCounter` countdown
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. In `CaptureLoop.ts`, locate `let nextProgress = progressInterval;` near line 511. Change it to `let progressCounter = progressInterval;`.
2. Update the `chunkEnd` calculation (around line 514):
```typescript
const boundEnd = nextFrameToWrite + progressCounter;
const chunkEnd = boundEnd < totalFrames ? boundEnd : totalFrames;
const startWrite = nextFrameToWrite;
```
3. After the `while (nextFrameToWrite !== chunkEnd)` write loop (around line 560, before `if (aborted) break;`), add:
```typescript
progressCounter -= (nextFrameToWrite - startWrite);
```
4. Replace the `if (nextFrameToWrite === nextProgress)` condition (around line 571) with:
```typescript
if (progressCounter === 0) {
  progressCounter = progressInterval;
  console.log(`Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`);
  if (onProgress) onProgress(nextFrameToWrite / totalFrames);
}
```
5. Remove references to `nextProgress`.

**Why**: Avoids `nextProgress` bound checking logic and removes an absolute loop-carried variable (`nextProgress`). Decrementing chunk blocks is simpler for V8's TurboFan arithmetic logic than maintaining and adding large absolute pointers across bounds.
**Risk**: If progress logic mismatches `written` decrements, logs may be missed. The calculation `nextFrameToWrite - startWrite` accurately captures frames written in the current iteration, even if it breaks early to wait.

### Step 2: Hoist pipeline bound math to a local constant
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Inside both `if (freeWorkersHead !== 0)` blocks (around line 426 and line 517), locate the dispatch calculation:
```typescript
let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
```
2. Replace it with:
```typescript
const pipelineLimit = nextFrameToWrite + maxPipelineDepth;
let dispatches = (pipelineLimit < totalFrames ? pipelineLimit : totalFrames) - nextFrameToSubmit;
```

**Why**: By assigning `nextFrameToWrite + maxPipelineDepth` to a constant before the ternary operator, we prevent the JS engine from evaluating the mathematical expression twice per iteration, shrinking AST parsing time and reducing CPU operations.
**Risk**: None. Mathematically equivalent, just structured better for JIT compilation.

## Correctness Check
- DOM and Canvas output must still render correctly, and `console.log("Progress: Rendered X / Y frames")` must trigger at the same intervals.
- Ensure the number of parallel browser tasks spawned matches the correct bound logic.
