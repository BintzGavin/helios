---
id: PERF-780
slug: precalculate-frame-times
status: complete
claimed_by: "executor-session"
created: 2024-06-16
completed: ""
result: "discard"
---

# PERF-780: Precalculate Frame Times using Typed Arrays

## Focus Area
The frame capture loops in `packages/renderer/src/core/CaptureLoop.ts` (`if (poolLen === 1)` block and `runWorker`).

## Background Research
In the hot loop, we currently calculate `time` and `compositionTimeInSeconds` on every frame using dynamic floating-point multiplication (`i * timeStep`). V8 must evaluate these instructions per frame and potentially allocate double-precision floats. By pre-calculating these values into contiguous memory blocks (`Float64Array`) before the loops start, we can eliminate per-frame math instructions and dynamic float allocation, relying on monomorphic, fast sequential memory access instead. A previous experiment (PERF-775) tried cumulative addition but regressed because it decoupled the calculation from the loop index, which TurboFan expects. Pre-calculating into an array maintains index-based access while removing the calculation overhead from the hot path.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s
- **Bottleneck analysis**: CPU instructions and dynamic float allocation in the capture hot loops.

## Implementation Spec

### Step 1: Pre-allocate Float64Arrays
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Immediately before the `if (poolLen === 1)` block, add the following pre-calculation logic:
```typescript
const timesArray = new Float64Array(totalFrames);
const compTimesArray = new Float64Array(totalFrames);
for (let i = 0; i < totalFrames; i++) {
    timesArray[i] = i * timeStep;
    compTimesArray[i] = (startFrame + i) * compTimeStep;
}
```
**Why**: Performs all floating-point math once before the capture process begins.
**Risk**: Very slight increase in memory footprint (~2.4KB for 150 frames), which is negligible.

### Step 2: Utilize arrays in Single Worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the single worker loop `for (let i = 0; i < totalFrames; i++)`, replace:
```typescript
const time = i * timeStep;
const compositionTimeInSeconds = (startFrame + i) * compTimeStep;
await timeDriver.setTime(page, compositionTimeInSeconds);
const buffer = strategy.processCaptureResult!(await strategy.capture(page, time));
```
with:
```typescript
await timeDriver.setTime(page, compTimesArray[i]);
const buffer = strategy.processCaptureResult!(await strategy.capture(page, timesArray[i]));
```
Apply this to both the `if (hasProcessFn)` and `else` branches.
**Why**: Replaces math operations with `Float64Array` index lookups.

### Step 3: Utilize arrays in Multi-Worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `runWorker`, apply the same substitution. Replace `const time = i * timeStep;` and `const compositionTimeInSeconds = (startFrame + i) * compTimeStep;` with the array accesses `timesArray[i]` and `compTimesArray[i]`.
**Why**: Consistency across execution paths.

## Variations
N/A

## Canvas Smoke Test
Run a canvas render (e.g., if supported by benchmark) to verify no syntax errors break the core loop logic.

## Correctness Check
Run the standard DOM benchmark (`npx tsx scripts/benchmark-perf.ts`) and ensure the output video is generated without visual issues or truncated duration.

## Prior Art
PERF-775 (Bypass time calculation using cumulative addition - discarded).

## Results Summary
- **Best render time**: ~2.435s (vs baseline ~2.069s)
- **Improvement**: Regressed
- **Kept experiments**:
- **Discarded experiments**: Precalculate Frame Times using Typed Arrays
