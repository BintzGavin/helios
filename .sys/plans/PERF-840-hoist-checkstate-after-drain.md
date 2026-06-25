---
id: PERF-840
slug: hoist-checkstate-after-drain
status: complete
claimed_by: ""
created: 2024-06-25
completed: ""
result: ""
---

# PERF-840: Remove Redundant checkState after drainPromise

## Focus Area
The multi-worker write loop in `CaptureLoop.ts` calls `checkState()` after awaiting `drainPromise`, but this is redundant because `PERF-839` already determined that the writer loop does not need to poll for workers unless `nextFrameToWrite` increments.

## Background Research
Currently, the write loop has this check after awaiting `drainPromise`:
```typescript
if (!writeSuccess && pendingBytes >= 16777216) {
    await this.drainPromise;
    pendingBytes = 0;
    if (freeWorkersHead > 0 || capturedErrors.length > 0)
        checkState();
}
```

`await this.drainPromise` yields control to the event loop. During this time, a worker might have finished a frame and become free, or a worker might have errored.

If a worker errored, the `catch` block in `runWorker` sets `aborted = true` and calls `checkState()`. The writer will see `aborted == true` at the top of the next loop iteration (or the current loop's conditions) and break.
If a worker freed, the `runWorker` block does `freeWorkers[freeWorkersHead++] = workerIndex; checkState();`. The `checkState()` function will immediately assign it a task IF there is pipeline capacity.

Pipeline capacity is governed by:
`nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth`

While the writer is awaiting `drainPromise`, `nextFrameToWrite` has *not* incremented yet (it increments right after the write logic). Therefore, pipeline capacity has *not* increased. `checkState()` will not be able to assign any new tasks.

Furthermore, right after this `if` block, the code does:
```typescript
nextFrameToWrite++;
if (freeWorkersHead > 0) checkState();
```
This is the correct time to call `checkState()`, because `nextFrameToWrite` has just incremented, increasing pipeline capacity!

Thus, the `checkState()` call inside the `if (!writeSuccess ...)` block is entirely redundant and wastes CPU cycles in the hot path. We can remove it.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median.

## Implementation Spec

### Step 1: Remove redundant `checkState` after drain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker paths (around lines 1228-1269), locate the two instances of `drainPromise` wait block inside the inner write loops:
```typescript
if (!writeSuccess && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
  if (freeWorkersHead > 0 || capturedErrors.length > 0)
    checkState();
}
```
Remove the `if (freeWorkersHead > 0 || capturedErrors.length > 0) checkState();` lines.
Leave only:
```typescript
if (!writeSuccess && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run --passWithNoTests packages/renderer/` to ensure no syntactical errors.

## Correctness Check
Run the DOM benchmark. Ensure that no frames are skipped and the pipeline continues to correctly wait for `drainPromise`.
