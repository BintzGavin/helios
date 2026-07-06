---
id: PERF-936
slug: unroll-math-min-for-chunk-end
status: unclaimed
claimed_by: ""
created: 2024-07-06
completed: ""
result: ""
---
# PERF-936: Use Math.min For Loop Chunk Boundaries

## Focus Area
`CaptureLoop.ts` - `chunkEnd` boundary calculations inside single and multi-worker rendering paths.

## Background Research
The `CaptureLoop.ts` engine contains multiple inner loops which batch progress using an inline conditional fallback for boundary calculations:
```typescript
let chunkEnd = i + progressInterval; if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;
// or
let chunkEnd = nextFrameToWrite + progressInterval; if (chunkEnd > totalFrames) chunkEnd = totalFrames;
```
As proven in earlier microbenchmarks (e.g. PERF-915) on Node v22, substituting this compound inline statement with V8's native `Math.min()` intrinsic provides significant speedups because V8 converts it directly into branchless conditional moves at the machine code level. Previous work already applied this to array lookups and limits. Here, applying it to chunk boundaries will optimize the per-batch setup overhead.

## Benchmark Configuration
- **Composition URL**: Standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The inline `if (chunkEnd > totalFrames)` branch forces branch prediction logic that can be avoided entirely using `Math.min()`. By substituting the calculation, V8 will optimize the hot loops.

## Implementation Spec

### Step 1: Replace chunkEnd logic in Single-Worker loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Search for occurrences of:
```typescript
let chunkEnd = i + progressInterval; if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;
```
(Found around lines 277, 372, 465, 598, 683, 775)
Replace with:
```typescript
const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);
```
**Why**: Avoids manual branch evaluation, leveraging optimized intrinsics.

### Step 2: Replace chunkEnd logic in Multi-Worker loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Search for occurrences of:
```typescript
let chunkEnd = nextFrameToWrite + progressInterval; if (chunkEnd > totalFrames) chunkEnd = totalFrames;
```
(Found around lines 1212, 1291)
Replace with:
```typescript
const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
```
**Why**: Ensures identical optimization is applied to the multi-worker loop boundaries.

## Variations
None.

## Canvas Smoke Test
Ensure the single-worker canvas logic runs smoothly by firing up a standard render.

## Correctness Check
Run the main `verify-all` test suite.
