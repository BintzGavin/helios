---
id: PERF-559
slug: fix-frame-time-ticks-scale
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-559: Fix `frameTimeTicks` scale in `DomStrategy.ts`

## Focus Area
`DomStrategy.capture()` passes `frameTimeTicks` to `HeadlessExperimental.beginFrame`.

## Background Research
Currently, `DomStrategy` sets `frameTimeTicks` like this:
```typescript
this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
```
`frameTime` is passed in as seconds (e.g., 0.033, 0.066, etc).
According to Chromium's CDP documentation, `frameTimeTicks` expects the timestamp in **milliseconds** of uptime. By passing `10000 + frameTime`, we are advancing the compositor's clock by merely 33 *microseconds* per frame instead of 33 *milliseconds*.

By properly scaling `frameTime` to milliseconds (`frameTime * 1000`), we correctly simulate a 30fps/60fps compositor cadence.

Note: A similar experiment was planned in PERF-399 but its code changes were seemingly lost or overridden.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: Suboptimal compositor clock progression.

## Implementation Spec

### Step 1: Scale `frameTime` by 1000
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture`, change both occurrences of:
```typescript
this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;
```
and
```typescript
this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
```
to multiply `frameTime` by 1000:
```typescript
this.targetBeginFrameParams.frameTimeTicks = 10000 + (frameTime * 1000);
```
and
```typescript
this.beginFrameParams.frameTimeTicks = 10000 + (frameTime * 1000);
```

**Why**: Aligns the compositor clock progression with the actual intended millisecond step.
**Risk**: Negligible. It aligns the code with the CDP documentation.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run`

## Correctness Check
Run the DOM render test suite (`npm run test -w packages/renderer -- --run`) to ensure it produces valid outputs without regressions.

## Prior Art
- PERF-399 implemented this but the changes appear to have been reverted.