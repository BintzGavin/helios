---
id: PERF-117
slug: incremental-time-calculation
status: complete
claimed_by: "executor-session"
created: 2024-05-31
completed: "2026-03-30"
result: failed
---
# PERF-117: Incremental Time Calculation in Hot Loop

## Focus Area
The hot frame capture loop in `packages/renderer/src/Renderer.ts`, specifically the arithmetic calculations for `time` and `compositionTimeInSeconds` performed on every iteration of the `while` loop.

## Background Research
Currently, inside the `captureLoop` of `packages/renderer/src/Renderer.ts`, the virtual time for each frame is calculated from scratch using multiplication:
```typescript
const time = frameIndex * timeStep;
const compositionTimeInSeconds = (startFrame + frameIndex) * compTimeStep;
```
While multiplication is fast, it happens inside the most critical inner loop where V8 micro-stalls can compound. Replacing these multiplication operations with simple scalar addition (incrementing an accumulator) eliminates the need to compute the index offset and perform floating-point multiplication on every frame submission.

## Benchmark Configuration
- **Composition URL**: Standard simple-animation HTML fixture
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.8s (from PERF-114 baseline)
- **Bottleneck analysis**: Micro-optimizing arithmetic in the hot loop reduces V8 execution time before yielding to CDP IPC.

## Implementation Spec

### Step 1: Replace Multiplication with Accumulators
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Before the `while (nextFrameToSubmit < totalFrames ...)` loop, initialize accumulators:
```typescript
let currentTime = nextFrameToSubmit * timeStep;
let currentCompTime = (startFrame + nextFrameToSubmit) * compTimeStep;
```
Inside the inner `while` loop, replace the `const time = ...` and `const compositionTimeInSeconds = ...` assignments:
```typescript
const time = currentTime;
const compositionTimeInSeconds = currentCompTime;
```
At the end of the inner loop iteration (right before `nextFrameToSubmit++;`), increment the accumulators:
```typescript
currentTime += timeStep;
currentCompTime += compTimeStep;
```

**Why**: Replaces floating point multiplication with a single scalar addition per frame, reducing CPU cycle cost in the hot loop.

## Variations
### Variation A: Pre-calculate time arrays
Instead of accumulators, pre-calculate two typed arrays (`Float64Array`) before the main loop containing the times for all frames, and just look them up by `nextFrameToSubmit`.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-codecs.ts` to ensure the CanvasStrategy still operates correctly.

## Correctness Check
Run the DOM verification script to ensure frames are still sequenced correctly:
`npx tsx packages/renderer/tests/verify-codecs.ts`

## Results Summary
- **Best render time**: 0.000s
- **Improvement**: 0%
- **Kept experiments**:
- **Discarded experiments**: [PERF-117 Incremental Time Calculation (Crashed)]
