---
id: PERF-946
slug: unroll-math-min-for-limit
status: unclaimed
claimed_by: ""
created: 2024-07-07
completed: ""
result: ""
---
# PERF-946: Remove duplicate maxSubmits assignment in inner loops

## Focus Area
`CaptureLoop.ts` - `limit` and `maxSubmits` calculation inside multi-worker rendering paths.

## Background Research
The multi-worker loop in `CaptureLoop.ts` currently calculates limits multiple times via:
```typescript
const maxSubmits = nextFrameToWrite + maxPipelineDepth;
const limit = Math.min(maxSubmits, totalFrames);
```
inside free worker dispatch loops. Instead of allocating a `maxSubmits` variable and passing it to `Math.min`, we can inline the expression directly:
```typescript
const limit = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames);
```
Microbenchmarks show that doing this directly improves execution time slightly by skipping an unnecessary variable assignment in tight loops.

## Benchmark Configuration
- **Composition URL**: Standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The explicit allocation of `const maxSubmits = nextFrameToWrite + maxPipelineDepth` inside `runWorker` (when calculating dispatches in the writer loops) increases AST and V8 context bounds marginally.

## Implementation Spec

### Step 1: Remove `maxSubmits` assignment in writer dispatch loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Search for occurrences of:
```typescript
const maxSubmits = nextFrameToWrite + maxPipelineDepth;
const limit = Math.min(maxSubmits, totalFrames);
```
Replace with:
```typescript
const limit = Math.min(nextFrameToWrite + maxPipelineDepth, totalFrames);
```
This occurs in multiple locations in the code (e.g., around line 893 and other locations).

**Why**: Using the engine's built-in `Math.min` intrinsic with direct expressions allows better inlining in conditional moves and avoids allocating a separate named variable in the tight inner loops.

## Variations
None.

## Canvas Smoke Test
Ensure the single-worker canvas logic runs smoothly by firing up a standard render.

## Correctness Check
Run \`npm run test -w packages/renderer\`.
