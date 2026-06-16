---
id: PERF-783
slug: restore-inline-time-calculation
status: unclaimed
claimed_by: ""
created: 2026-06-16
completed: ""
result: ""
---

# PERF-783: Restore Inline Time Calculation

## Focus Area
The single-worker and multi-worker hot loops inside `packages/renderer/src/core/CaptureLoop.ts`. Specifically, how frame times (`timesArray[i]` and `compTimesArray[i]`) are accessed per frame.

## Background Research
In PERF-780, we attempted to optimize the frame capture loop by pre-calculating the `time` and `compositionTimeInSeconds` for all frames using `Float64Array` typed arrays outside the loops (`timesArray` and `compTimesArray`). The goal was to reduce per-frame floating-point multiplication overhead.
However, benchmark results recorded in the shared journal demonstrated that this actually regressed median render times. V8 natively optimizes simple arithmetic (`i * timeStep`) inside monomorphic loops incredibly well using TurboFan. Introducing array indexing reads (`timesArray[i]`) added memory access overhead and bounds checking which proved slower than the native inline multiplications.
Therefore, this experiment will undo the changes introduced by PERF-780 and restore the inline arithmetic to reclaim that lost performance.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s (baseline fast path prior to PERF-780).
- **Bottleneck analysis**: The typed array allocation and subsequent per-iteration array lookups inside the hot loops of `CaptureLoop.ts` are a documented source of regression.

## Implementation Spec

### Step 1: Remove typed array pre-allocation
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the allocation and population of `timesArray` and `compTimesArray`:
```typescript
    const timesArray = new Float64Array(totalFrames);
    const compTimesArray = new Float64Array(totalFrames);
    for (let i = 0; i < totalFrames; i++) {
        timesArray[i] = i * timeStep;
        compTimesArray[i] = (startFrame + i) * compTimeStep;
    }
```
**Why**: Eliminates the upfront allocation and iteration overhead, which was proven counter-productive.

### Step 2: Restore inline math in single-worker fast path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker block (`if (poolLen === 1)`), replace array accesses with direct inline calculations:
```typescript
const time = i * timeStep;
const compositionTimeInSeconds = (startFrame + i) * compTimeStep;
await timeDriver.setTime(page, compositionTimeInSeconds);
// Update strategy.capture and strategy.processCaptureResult calls to use `time` instead of `timesArray[i]`
```
**Why**: Allows V8 to optimize the floating-point math directly inside the loop context.

### Step 3: Restore inline math in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `runWorker` function, make identical replacements:
```typescript
const time = i * timeStep;
const compositionTimeInSeconds = (startFrame + i) * compTimeStep;
await timeDriver.setTime(page, compositionTimeInSeconds);
// Update strategy.capture and strategy.processCaptureResult calls to use `time` instead of `timesArray[i]`
```

## Variations
None.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure no syntax or logical errors break basic rendering.

## Correctness Check
Run the DOM benchmark. Ensure the video plays back at the correct speed and duration, validating that the time steps are calculated accurately.

## Prior Art
- PERF-780: The original precalculation experiment that caused the regression.
- PERF-775: Similar failed experiment attempting to use cumulative addition (`time += timeStep`). V8 loves simple `i * multiplier` math in loops.
