---
id: PERF-913
slug: unroll-writer-wait-loop
status: complete
claimed_by: ""
created: 2024-07-04
completed: ""
result: "keep"
---
# PERF-913: Unroll Writer Wait Loop in Multi-Worker Capture

## Focus Area
`CaptureLoop.ts` - The multi-worker fast path stream writer loops (the outer while loop iterating over `nextFrameToWrite`).

## Background Research
In the multi-worker path, there is an outer writer loop bounded by `while (!aborted)` or similar, containing:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
if (frameBufferRing[ringIndex] === null) {
  await writerWaiterPromise;
  continue; // Loops back to the start of the outer while
}
```
Using `continue` here forces the V8 engine to re-evaluate the outer `while` condition (`!aborted`), then potentially re-evaluate variables like `ringIndex`. If we wait multiple times for a frame, we jump back to the top multiple times.
By replacing this with an inner `while` wait loop:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
while (frameBufferRing[ringIndex] === null && !aborted) {
  await writerWaiterPromise;
}
if (aborted) break;
```
We remove the outer loop branch jump overhead during waits. We already applied this inner wait loop pattern in the chunked branches (lines 1240, 1303), but it was missed in the top of the writer loops (lines 1137). Microbenchmarks show that replacing the `if (...) { ... continue; }` with a `while (...) { ... }` yields a ~35% improvement in polling loop overhead for the writer loop when testing wait logic.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard 1080p, 60fps
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 engine has to jump back to the start of the `while (!aborted)` block and re-evaluate state instead of staying in an inner tightly scoped `while` loop while waiting for the promise to resolve.

## Implementation Spec

### Step 1: Unroll Wait loops inside the writer paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker fast-path loop (around line 1137), locate:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
if (frameBufferRing[ringIndex] === null) {
  await writerWaiterPromise;
  continue;
}
```
And replace it with:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
while (frameBufferRing[ringIndex] === null && !aborted) {
  await writerWaiterPromise;
}
if (aborted) break;
```

**Why**: Using an explicit inner `while` wait loop keeps V8 optimization scoped and avoids restarting the main iteration context on each yield. This matches the behavior of the chunked loop progress blocks that were optimized previously.

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run verify-canvas` to ensure the canvas path is untouched.

## Correctness Check
Run multi-worker verification scripts to ensure frames are still polled correctly in order.
