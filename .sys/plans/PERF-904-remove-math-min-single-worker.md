---
id: PERF-904
slug: remove-math-min-single-worker
status: unclaimed
claimed_by: ""
created: 2024-07-03
completed: ""
result: ""
---
# PERF-904: Remove `Math.min` from Single-Worker Chunk Loops

## Focus Area
`CaptureLoop.ts` - The single-worker chunk traversal loops.

## Background Research
In PERF-893, we removed `Math.min(..., totalFrames)` inside the multi-worker chunk boundaries and used inline conditionals instead. However, `Math.min` is still extensively used in the single-worker fallback paths (e.g., `const chunkEnd = Math.min(i + progressInterval, totalFrames - 1)`).

V8 profiles indicate that `Math.min` involves unnecessary function call overhead inside these tight loops. By replacing:
```typescript
const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);
```
with:
```typescript
let chunkEnd = i + progressInterval;
if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;
```
we bypass the dynamic arguments mapping and function invocation of `Math.min`, relying purely on fast inline CPU-level branching. Prior experiments on the multi-worker path (PERF-893) showed this yields a measurable microbenchmark execution time improvement.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker path specifically)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 engine evaluates the `Math.min` call on every chunk evaluation (e.g., once every 30 frames in the outer loop). Removing the function call overhead reduces per-chunk dispatch time.

## Implementation Spec

### Step 1: Update the single-worker chunk loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Find all instances in the single-worker paths (e.g., lines 276, 371, 465, 538, 672, 757, 850, 911) where `Math.min` is used to calculate `chunkEnd`.

Replace:
```typescript
const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);
```
with:
```typescript
let chunkEnd = i + progressInterval;
if (chunkEnd > totalFrames - 1) chunkEnd = totalFrames - 1;
```

Also, update any remaining `Math.min` usages for `chunkEnd` in the multi-worker writer path (e.g., lines 1450, 1523):
Replace:
```typescript
const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
```
with:
```typescript
let chunkEnd = nextFrameToWrite + progressInterval;
if (chunkEnd > totalFrames) chunkEnd = totalFrames;
```

**Why**: Relying purely on basic boolean operators avoids function call overhead in tight V8 loops.
**Risk**: Minimal, as logic remains identical.

## Canvas Smoke Test
Run `npx vitest run verify-canvas` to ensure the canvas path is untouched.

## Correctness Check
Run `npm test -w packages/renderer` to ensure no frame synchronization regressions occurred.
