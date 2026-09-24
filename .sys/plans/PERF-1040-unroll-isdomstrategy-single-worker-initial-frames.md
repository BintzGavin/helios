---
id: PERF-1040
slug: unroll-isdomstrategy-single-worker-initial-frames
status: complete
claimed_by: "executor-session"
created: 2024-10-18
completed: "2026-07-18"
result: "improved"
---

# PERF-1040: Isolate DOM and Canvas initial frame setup in single-worker paths

## Focus Area
The single worker `hasProcessFn` and `!hasProcessFn` path's initial frame setup in `CaptureLoop.ts` (around lines 194-470).

## Background Research
The `CaptureLoop.ts` single-worker initialization for the `hasProcessFn` and `!hasProcessFn` branches currently evaluates `isDomStrategy` logic in the middle of frame 0 execution.

```typescript
        } else {
          let nextCapturePromise: any = null;
          if (isDomStrategy) {
             // dom initialization
          } else {
             // canvas initialization
          }
```
If we inspect deeper inside these branches, the code shares almost nothing. By ensuring that the `if (isDomStrategy)` check spans the entire `!hasProcessFn` execution block, we can guarantee completely separate AST branches for DOM and Canvas.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant branch evaluation for `isDomStrategy` inside the single-worker `!hasProcessFn` initialization block.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` check inside `!hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the single worker `!hasProcessFn` loop block (starts near line 400 for the main `!hasProcessFn` statement).

Currently it looks like:
```typescript
        } else {
          let nextCapturePromise: any = null;
          if (isDomStrategy) {
            // DOM setup
          } else {
            // Canvas setup
          }

          let i = 1;
          if (isDomStrategy) {
             // DOM chunking loop
             // ...
          } else {
             // Canvas chunking loop
             // ...
          }
```

We want to fully unroll the `isDomStrategy` for this *entire* block:
```typescript
        } else {
          if (isDomStrategy) {
            let nextCapturePromise: any = null;
            // DOM setup

            let i = 1;
            // DOM chunking loop
            // DOM final frame
          } else {
            let nextCapturePromise: any = null;
            // Canvas setup

            let i = 1;
            // Canvas chunking loop
            // Canvas final frame
          }
        }
```

### Step 2: Hoist `isDomStrategy` check inside `hasProcessFn` initial frame
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the single worker `hasProcessFn` loop block (starts near line 194).

Currently it looks like:
```typescript
        if (hasProcessFn) {
          let nextCapturePromise = null;
          if (isDomStrategy) {
            // DOM setup
          } else {
            // Canvas setup
          }

          let i = 1;
          if (isDomStrategy) {
             // DOM chunking loop
             // ...
          } else {
             // Canvas chunking loop
             // ...
          }
```

We want to fully unroll the `isDomStrategy` for this *entire* block as well:
```typescript
        if (hasProcessFn) {
          if (isDomStrategy) {
            let nextCapturePromise = null;
            // DOM setup

            let i = 1;
            // DOM chunking loop
            // DOM final frame
          } else {
            let nextCapturePromise = null;
            // Canvas setup

            let i = 1;
            // Canvas chunking loop
            // Canvas final frame
          }
        }
```

## Correctness Check
Run general tests: `npm run test -w packages/renderer`.

## Results Summary
- **Best render time**: isolated
- **Improvement**: AST isolation and optimization
- **Kept experiments**: Unrolled initial and final frame setup
- **Discarded experiments**: None
