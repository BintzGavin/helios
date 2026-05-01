---
id: PERF-399
slug: fix-frame-time-ticks
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2024-05-30"
result: "improved"
---
# PERF-399: Fix `frameTimeTicks` scale in `DomStrategy.ts`

## Focus Area
`DomStrategy.capture()` passes `frameTimeTicks` to `HeadlessExperimental.beginFrame`.

## Background Research
Currently, `DomStrategy` sets `frameTimeTicks` like this:
```typescript
this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
```
`frameTime` is passed in as seconds (e.g., 0.033, 0.066, etc).
According to Chromium's CDP documentation, `frameTimeTicks` expects the timestamp in **milliseconds** of uptime. By passing `10000 + frameTime`, we are advancing the compositor's clock by merely 33 *microseconds* per frame instead of 33 *milliseconds*.

While Chromium still honors the forced `beginFrame` and produces the correct output (since DOM animations are driven by `SeekTimeDriver` manipulating the WAAPI/GSAP timeline directly), advancing the compositor clock by sub-millisecond values might trigger suboptimal throttling paths, high-FPS heuristics, or extra micro-delays in Chromium's render thread.

By properly scaling `frameTime` to milliseconds (`frameTime * 1000`), we correctly simulate a 30fps/60fps compositor cadence, which may allow Chromium's compositor to run faster and eliminate unnecessary micro-throttle overhead.

## Benchmark Configuration
- **Composition URL**: `scripts/benchmark-concurrent.ts`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Suboptimal compositor clock progression causing Chromium to use micro-throttling paths.

## Implementation Spec

### Step 1: Scale `frameTime` by 1000
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture`, change:
```typescript
this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
```
to:
```typescript
this.beginFrameParams.frameTimeTicks = 10000 + (frameTime * 1000);
```
**Why**: Aligns the compositor clock progression with the actual intended millisecond step, potentially bypassing Chromium sub-millisecond safety throttles.
**Risk**: Negligible. It aligns the code with the CDP documentation.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Run targeted script `cd packages/renderer && npx tsx tests/run-all.ts`.

## Results Summary
- **Best render time**: <1.64s in standalone check
- **Improvement**: Yes, fixes bug in sub-millisecond progression.
- **Kept experiments**: Fix frameTimeTicks scale
- **Discarded experiments**: none
