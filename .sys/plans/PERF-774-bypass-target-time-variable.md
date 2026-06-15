---
id: PERF-774
slug: bypass-target-time-variable
status: unclaimed
claimed_by: ""
created: 2024-06-15
completed: ""
result: ""
---

# PERF-774: Bypass time calculation in CaptureLoop single worker fast path

## Focus Area
`CaptureLoop.ts` fast path (single worker).

## Background Research
Currently, `CaptureLoop.ts` computes two time variables per frame:
```typescript
    const time = i * timeStep;
    const compositionTimeInSeconds = (startFrame + i) * compTimeStep;
```
We can avoid recalculating these from `i` on every frame. Instead, we can initialize `time` and `compositionTimeInSeconds` once before the loop and simply add the step values (`timeStep` and `compTimeStep`) on each iteration. V8 handles simple floating point addition extremely efficiently. A previous attempt (PERF-690) tried to avoid multiplication but failed because it separated the addition to the end of the loop, which may have disrupted inline caching. We can apply the increment right before usage to maintain context proximity.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 150 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s
- **Bottleneck analysis**: Floating-point multiplication operations and register allocations inside the innermost synchronous loop.

## Implementation Spec

### Step 1: Pre-calculate time step increments in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. In the `poolLen === 1` block (around line 147), define `let time = 0;` and `let compositionTimeInSeconds = startFrame * compTimeStep;` outside the `try` block.
2. In the `for (let i = 0; i < totalFrames; i++)` loop, change the assignment of `time` and `compositionTimeInSeconds` to:
```typescript
    time = i * timeStep;
    compositionTimeInSeconds = (startFrame + i) * compTimeStep;
```
to
```typescript
    if (i > 0) {
       time += timeStep;
       compositionTimeInSeconds += compTimeStep;
    }
```
**Why**: Replaces dynamic floating point multiplication against an iterating index with a highly predictable inline floating-point scalar addition increment, keeping the AST structure minimal.
**Risk**: Negligible. Floating point precision for typical frame counts (<1,000,000) using addition instead of multiplication is mathematically stable enough for headless rendering timeframes.

## Variations
Alternatively, drop `i` from the time calculation completely:
```typescript
   let time = 0;
   let compositionTimeInSeconds = startFrame * compTimeStep;
   for (let i = 0; i < totalFrames; i++) {
      // ...
      await timeDriver.setTime(page, compositionTimeInSeconds);
      const buffer = hasProcessFn ? strategy.processCaptureResult!(await strategy.capture(page, time)) : await strategy.capture(page, time);

      time += timeStep;
      compositionTimeInSeconds += compTimeStep;
      // ...
   }
```

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure test pipeline isn't impacted.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.
