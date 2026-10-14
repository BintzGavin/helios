---
id: PERF-1072
slug: fast-path-single-worker-chunk-bounds
status: unclaimed
claimed_by: ""
created: 2026-10-14
completed: ""
result: ""
---

# PERF-1072: Fast-path single-worker chunk bounds using nextProgress

## Focus Area
The single-worker writer chunk loops in `CaptureLoop.ts` (`isDomStrategy` and `!isDomStrategy` single-worker paths).

## Background Research
Currently, the single-worker chunk loops calculate the end of the chunk on every iteration using `Math.min`:
`const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);`

However, similar to the multi-worker paths (PERF-1070), the variable `nextProgress` already tracks the logical progress boundary. Since `nextProgress` is initially set to `progressInterval + 1` (accounting for the 0th frame), replacing the `Math.min` operation with a conditional based on `nextProgress` (i.e. `const chunkEnd = nextProgress < totalFrames - 1 ? nextProgress : totalFrames - 1;`) avoids redundantly adding `progressInterval` to `i` and eliminates the `Math.min` overhead.

Microbenchmarks (similar to the ones validating PERF-1070) show that bypassing `Math.min` overhead and redundant addition in tight loops speeds up V8 branch evaluation logic.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: Standard single-worker settings.
- **Mode**: `dom` and `canvas`
- **Metric**: Execution speed in microbenchmarks / Wall-clock render time in seconds.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Bottleneck analysis**: Unnecessary re-calculation of loop chunk boundaries via `Math.min(i + progressInterval, totalFrames - 1)` when `nextProgress` holds the exact value.

## Implementation Spec

### Step 1: Optimize single-worker DOM strategy chunk limit
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `isDomStrategy` loop (around line 210), change:
```typescript
            const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);
```
To:
```typescript
            const chunkEnd = nextProgress < totalFrames - 1 ? nextProgress : totalFrames - 1;
```

### Step 2: Optimize single-worker non-DOM strategy chunk limit
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `!isDomStrategy` loop (around line 324), change:
```typescript
            const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);
```
To:
```typescript
            const chunkEnd = nextProgress < totalFrames - 1 ? nextProgress : totalFrames - 1;
```

**Why**: Using `nextProgress` avoids redundantly adding `progressInterval` on each chunk iteration and bypasses `Math.min` overhead, speeding up V8 TurboFan branch evaluation logic.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure frame limits aren't violated.

## Correctness Check
Run renderer in a real project to verify output correctly finishes at `totalFrames`.
