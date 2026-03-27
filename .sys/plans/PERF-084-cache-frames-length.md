---
id: PERF-084
slug: cache-frames-length
status: complete
claimed_by: "executor-session"
created: 2026-03-27
completed: 2026-03-27
result: no-improvement
---

# PERF-084: Cache `frames.length` in TimeDrivers to avoid redundant access

## Focus Area
The `setTime` loop in `packages/renderer/src/drivers/SeekTimeDriver.ts` and `CdpTimeDriver.ts`. We are targeting the repetitive access to `frames.length` during frame evaluation loops.

## Background Research
In Playwright, `page.frames()` returns an array. While accessing the `length` property of an array in V8 is generally O(1) and very fast, inside hot paths like `setTime()` which executes per-frame across the entire composition, doing it repetitively within the `for` loop condition (`i < frames.length`) can introduce minor overhead. Caching `frames.length` to a local variable (`const numFrames = frames.length`) ensures it's read exactly once before the loop, slightly reducing property lookups and allowing better V8 optimization. (This was partially identified in PERF-081, but never claimed/executed).

## Benchmark Configuration
- **Composition URL**: Standard benchmark
- **Render Settings**: 1920x1080, 30 FPS, 10 seconds, libx264
- **Mode**: `dom` (for SeekTimeDriver) and `canvas` (for CdpTimeDriver)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: Micro-optimizing the loop condition in the hot path.

## Implementation Spec

### Step 1: Cache `frames.length` in SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `setTime` method, change:
```typescript
    const promises: Promise<any>[] = new Array(frames.length);

    for (let i = 0; i < frames.length; i++) {
```
to:
```typescript
    const numFrames = frames.length;
    const promises: Promise<any>[] = new Array(numFrames);

    for (let i = 0; i < numFrames; i++) {
```
**Why**: Avoids repeated property lookup on `frames` in the loop condition.
**Risk**: Very low, simple variable caching.

### Step 2: Cache `frames.length` in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `setTime` method, change:
```typescript
      const framePromises: Promise<any>[] = new Array(frames.length);
      for (let i = 0; i < frames.length; i++) {
```
to:
```typescript
      const numFrames = frames.length;
      const framePromises: Promise<any>[] = new Array(numFrames);
      for (let i = 0; i < numFrames; i++) {
```
**Why**: Same reasoning, avoiding redundant property lookups in the loop condition.
**Risk**: Very low.

## Correctness Check
1. The DOM verification tests (`npx tsx packages/renderer/tests/verify-dom-selector.ts`) should pass.
2. The renderer benchmark should execute without errors and produce valid video output.

## Results Summary
- **Best render time**: 34.764s (vs baseline 33.577s)
- **Improvement**: -3.53%
- **Kept experiments**: None
- **Discarded experiments**: Cache frames.length in SeekTimeDriver and CdpTimeDriver loops
