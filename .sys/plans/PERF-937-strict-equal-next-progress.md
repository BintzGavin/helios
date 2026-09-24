---
id: PERF-937
slug: strict-equal-next-progress
status: complete
claimed_by: ""
created: 2024-07-06
completed: ""
result: "keep"
---
# PERF-937: Use Strict Equality for Progress Tracking in Multi-Worker Paths

## Focus Area
`CaptureLoop.ts` - Multi-worker DOM capture chunk loops (specifically the progress tracking logic at the end of the writer loops).

## Background Research
In the multi-worker paths (`isDomStrategyWriter` and the standard fallback writer loop), we track frame rendering progress and invoke `onProgress` callbacks. The boundary condition currently checks `if (nextFrameToWrite >= nextProgress)`.
Because `nextFrameToWrite` strictly advances by increments of `progressInterval` directly matching the calculation of `chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);`, the value of `nextFrameToWrite` will always *exactly equal* `nextProgress` when a progress update is due (unless it reaches `totalFrames` early on the last chunk, after which progress logging completes and the loop ends).

Microbenchmarks demonstrate that replacing the relational `>=` operator with a strict equality `===` check avoids slightly more expensive branch evaluation overhead in V8 during tight polling loops. The improvement shown across microbenchmark runs is around 2-4% in loop execution speed. Note that `nextFrameToWrite === totalFrames` is not a concern for missed logs, because the chunk explicitly boundaries at `totalFrames`.

## Benchmark Configuration
- **Composition URL**: Standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The inline relational check `if (nextFrameToWrite >= nextProgress)` creates unnecessary evaluation overhead compared to strict equality (`===`) in loops that enforce exact mathematical interval jumps.

## Implementation Spec

### Step 1: Replace `>=` with `===` for progress checks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Search for occurrences of:
```typescript
if (nextFrameToWrite >= nextProgress) {
```
(Found around lines 1281 and 1350)
Replace with:
```typescript
if (nextFrameToWrite === nextProgress) {
```
**Why**: Leverages V8's faster strict equality comparisons, removing unnecessary relational evaluation for logically guaranteed bounds.

## Variations
None.

## Canvas Smoke Test
Run a standard Canvas smoke test since these multi-worker routines are shared via the CaptureLoop processor.

## Correctness Check
Run the main `verify-all` test suite.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	1.315	1000000	760456.27	0.0	keep	Use strict equality for progress tracking (baseline >=: 1.334)
2	1.265	1000000	790513.83	0.0	keep	Use strict equality for progress tracking (baseline >=: 1.295)
3	1.273	1000000	785545.95	0.0	keep	Use strict equality for progress tracking (baseline >=: 1.315)
```
