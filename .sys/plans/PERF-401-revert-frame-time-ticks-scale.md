---
id: PERF-401
slug: revert-frame-time-ticks-scale
status: unclaimed
claimed_by: ""
created: 2024-06-01
completed: ""
result: ""
---

# PERF-401: Revert `frameTimeTicks` scale in `DomStrategy.ts` to fix compositor logic

## Focus Area
`DomStrategy.capture()` parameter assignment.

## Background Research
In `PERF-399`, the `frameTimeTicks` passed to `HeadlessExperimental.beginFrame` was updated to `10000 + (frameTime * 1000)`. The logic was that since CDP expects `frameTimeTicks` in milliseconds, and `frameTime` was assumed to be in seconds, multiplying by 1000 would yield the correct millisecond timestamp.

However, an inspection of `CaptureLoop.ts` reveals that the `time` argument passed to `strategy.capture(page, time)` is computed as `i * timeStep` where `timeStep = 1000 / fps`. Thus, `frameTime` is **already in milliseconds** (e.g., 16.666).

By multiplying `frameTime` by 1000 in `DomStrategy.ts`, we are actually sending `16.666 * 1000 = 16666` milliseconds to the compositor per frame. This means Chromium believes **16.6 seconds** have elapsed between every single frame tick! This massive virtual time jump forces Chromium's task scheduler to run idle garbage collection, layout thrashing, and animation catch-ups for 16 virtual seconds on every single frame, severely degrading DOM capture performance.

Reverting this back to `10000 + frameTime` restores the correct 16ms delta.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Passing a 16-second delta to `HeadlessExperimental.beginFrame` forces Chromium to perform unnecessary idle task cleanup and animation catch-ups, bottlenecking CPU rendering throughput.

## Implementation Spec

### Step 1: Remove the 1000x multiplier
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, change the assignment back to just adding `frameTime`.

```typescript
<<<<<<< SEARCH
    this.beginFrameParams.frameTimeTicks = 10000 + (frameTime * 1000);
=======
    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
>>>>>>> REPLACE
```

**Why**: `frameTime` from `CaptureLoop.ts` is already in milliseconds. Adding it directly to the 10000ms baseline satisfies the CDP `frameTimeTicks` requirement without triggering a 16-second delta logic bug in the browser.
**Risk**: None. This reverts a flawed experiment that incorrectly assumed the unit of `frameTime`.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Run targeted script `npx tsx tests/verify-dom-strategy-capture.ts`.
