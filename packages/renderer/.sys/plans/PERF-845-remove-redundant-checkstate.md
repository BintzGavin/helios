---
id: PERF-845
slug: remove-redundant-checkstate-multi-worker
status: complete
claimed_by: "Jules"
created: 2024-06-25
completed: ""
result: ""
---

# PERF-845: Remove Redundant checkState in Multi-Worker Wait Loops

## Focus Area
The multi-worker write loops in `CaptureLoop.ts` still contain redundant `checkState()` polling inside the `writerWaiterPromise` wait loops, despite PERF-839 hoisting it from the outer loops.

## Background Research
In `CaptureLoop.ts`, the writer loop waits for frames to be ready:
```typescript
while (frameReadyRing[ringIndex] === 0 && !aborted) {
  await writerWaiterPromise;
  if (freeWorkersHead > 0 || capturedErrors.length > 0)
    checkState();
}
```
This `checkState()` call is entirely redundant and wastes CPU cycles because:
1. **Errors**: If a worker errors, it sets `aborted = true`, calls `checkState()`, and resolves the promise. The writer wakes up, sees `aborted` is true, and breaks the loop.
2. **Worker Freeing**: Workers call `checkState()` when they go to sleep. The only time the writer needs to wake them up is when `nextFrameToWrite` increments (opening pipeline capacity). The writer *already* correctly calls `if (freeWorkersHead > 0) checkState()` immediately after `nextFrameToWrite++`.
3. **While Waiting**: While the writer is waiting for a frame, `nextFrameToWrite` has *not* changed. Therefore, calling `checkState()` cannot possibly assign any new tasks to free workers due to pipeline capacity constraints.

Removing this inner polling will further reduce the overhead of the single-threaded writer loop, which is critical since it also performs the synchronous Base64 decoding.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Mode**: `dom`
- **Metric**: Microbenchmark loop iteration time or wall-clock render time.
- **Minimum runs**: 3 per experiment, report median.

## Implementation Spec

### Step 1: Remove redundant `checkState` from wait loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker paths (around lines 1150-1300), locate the three instances of the wait loop:
```typescript
while (frameReadyRing[ringIndex] === 0 && !aborted) {
  await writerWaiterPromise;
  if (freeWorkersHead > 0 || capturedErrors.length > 0)
    checkState();
}
```
(Note: the first instance might be an `if` with a `continue` because it's part of the first-frame peek loop).
Change all of them to just:
```typescript
while (frameReadyRing[ringIndex] === 0 && !aborted) {
  await writerWaiterPromise;
}
```
And for the first-frame peek (around line 1154):
```typescript
if (frameReadyRing[ringIndex] === 0) {
  await writerWaiterPromise;
  continue;
}
```

## Variations
None.

## Correctness Check
Ensure tests pass and rendering does not hang.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
2	1.376	10000000	0.00	0.0	keep	PERF-845 remove redundant checkState in multi-worker path (baseline: 1.419s)
```
