---
id: PERF-1140
slug: optimize-progress-counter-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-10-26
completed: ""
result: ""
---

# PERF-1140: Optimize Progress Counter in Multi-Worker Writer Loop

## Focus Area
The hot multi-worker writer loops in `CaptureLoop.ts` (`nextFrameToWrite !== totalFrames` block for the writer thread) track progress logging by comparing `nextFrameToWrite` against an absolute target `nextProgress`.

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

PERF-1139 attempted this but failed because the multi-worker loop asynchronously waits for frames, and the simple subtraction `progressCounter -= chunkLen` inside the loop body incorrectly assumed the entire chunk was processed in one pass. Since the multi-worker loop handles frames one by one in some cases, or jumps out to wait, we need to correctly decrement the counter inside the `while (nextFrameToWrite !== chunkEnd)` loop, or correctly track `nextFrameToWrite` differences.

Actually, the multi-worker loop processes up to `chunkEnd`, which is set by `nextProgress`. We can just compute `chunkEnd` using `progressCounter` like single worker does: `const chunkEnd = nextFrameToWrite + progressCounter < totalFrames ? nextFrameToWrite + progressCounter : totalFrames;`.

Wait, the single-worker does:
```typescript
let progressCounter = progressInterval;
...
const boundEnd = i + progressCounter;
const chunkEnd = boundEnd < loopEnd ? boundEnd : loopEnd;
const chunkLen = chunkEnd - i;

for (; i !== chunkEnd; i++) {
  // process frame
}

progressCounter -= chunkLen;
if (progressCounter === 0) {
  progressCounter = progressInterval;
  // log progress
}
```
In multi-worker, the loop handles writing frames. If the frame is not ready, it waits:
```typescript
while (nextFrameToWrite !== chunkEnd) {
  const ringIndex = nextFrameToWrite & ringMask;
  if (frameBufferRing[ringIndex] === null) {
    break;
  }
  // write frame
  nextFrameToWrite++;
}

if (nextFrameToWrite !== chunkEnd) {
   // wait
}

if (nextFrameToWrite === nextProgress) {
   // log
}
```
If we change it to:
```typescript
let progressCounter = progressInterval;
while (nextFrameToWrite !== totalFrames && !aborted) {
  const boundEnd = nextFrameToWrite + progressCounter;
  const chunkEnd = boundEnd < totalFrames ? boundEnd : totalFrames;

  // worker dispatch ...

  const startWrite = nextFrameToWrite;
  while (nextFrameToWrite !== chunkEnd) {
    // ... write frame
    nextFrameToWrite++;
  }

  const written = nextFrameToWrite - startWrite;
  progressCounter -= written;

  if (aborted) break;

  if (nextFrameToWrite !== chunkEnd) {
    // wait
  }

  if (progressCounter === 0) {
    progressCounter = progressInterval;
    // log progress
  }
}
```
Wait, if it waits, it might loop around the `while (nextFrameToWrite !== totalFrames)` loop again!
If it loops again, `nextFrameToWrite` has increased, `progressCounter` has decreased. The new `chunkEnd` will be `nextFrameToWrite + progressCounter`, which is exactly the same target absolute index as before!
This correctly maintains the boundary without using absolute indexing.

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

## Correctness Check
- DOM output must still render correctly, and `console.log("Progress: Rendered X / Y frames")` must trigger at the same intervals.
