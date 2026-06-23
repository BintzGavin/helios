---
id: PERF-827
slug: unswitch-capture-branch-initial-frames
status: unclaimed
claimed_by: ""
created: 2026-06-23
completed: ""
result: ""
---

# PERF-827: Inline Strategy Calls for Initial Frames in Single-Worker Fast Path

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` single-worker path.

## Background Research
PERF-824 successfully inlined strategy calls (`strategy.capture` and `strategy.processCaptureResult`) in the single-worker hot loop (the `while` loops iterating over the frames). However, it missed the *initial pipeline setup* for the first two frames (frame 0 and frame 1) outside the loop.

Because the initial setup still uses polymorphic interface dispatch:
```typescript
nextCapturePromise = strategy.capture(page, 0); // Not inlined
// ...
nextCapturePromise = strategy.capture(page, timeStep); // Not inlined
// ...
const buffer = strategy.processCaptureResult!(rawResult); // Not inlined
```
It introduces minor unnecessary overhead at the start of the render. More importantly, it leaves the code inconsistent. Since we already establish the `isDomStrategy` flag and cache `domCdpSession` and `domBeginFrameParams` outside the loops, we should apply the same monomorphic fast path to the initial frames.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: Interface dispatch overhead in the single-worker loop initialization sequence.

## Implementation Spec

### Step 1: Inline Strategy Calls in `hasProcessFn` branch (Initial frames)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path (`if (poolLen === 1)`), locate the initial frame capture setup before the `while` loops, specifically in the `if (hasProcessFn)` block.

Replace:
```typescript
nextCapturePromise = strategy.capture(page, 0);
```
with:
```typescript
if (isDomStrategy) {
    nextCapturePromise = domCdpSession!.send('HeadlessExperimental.beginFrame', domBeginFrameParams);
} else {
    nextCapturePromise = strategy.capture(page, 0);
}
```

Replace:
```typescript
nextCapturePromise = strategy.capture(page, timeStep);
```
with:
```typescript
if (isDomStrategy) {
    nextCapturePromise = domCdpSession!.send('HeadlessExperimental.beginFrame', domBeginFrameParams);
} else {
    nextCapturePromise = strategy.capture(page, timeStep);
}
```

Replace:
```typescript
const buffer = strategy.processCaptureResult!(rawResult);
```
with:
```typescript
let buffer;
if (isDomStrategy) {
    const data = rawResult.screenshotData;
    if (data) {
        (strategy as any).lastFrameData = data;
    }
    buffer = (strategy as any).lastFrameData;
} else {
    buffer = strategy.processCaptureResult!(rawResult);
}
```

### Step 2: Inline Strategy Calls in `!hasProcessFn` branch (Initial frames)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, under the `else` block for `!hasProcessFn`.

Replace the two instances of `nextCapturePromise = strategy.capture(...)` using the same `isDomStrategy` condition as above.

**Why**: Consistently bypassing interface dispatch for all frames to minimize overhead and standardize the execution path.
**Risk**: Negligible risk.

## Variations
No variations needed.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure `canvas` mode is not broken.

## Correctness Check
Run the `dom` mode benchmark script to verify output is identical.

## Prior Art
- PERF-824: Plan to inline strategy calls in single-worker path (missed the initial frames).
- PERF-825: Plan to inline strategy calls in multi-worker path.
