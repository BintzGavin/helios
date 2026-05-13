---
id: PERF-497
slug: optimize-orchestrator-state-checks
status: unclaimed
claimed_by: ""
created: 2026-05-13
completed: ""
result: ""
---
# PERF-497: Optimize Orchestrator State Checks in CaptureLoop

## Focus Area
The actor model orchestrator loop (`CaptureLoop.ts`).

## Background Research
Currently, the `CaptureLoop` orchestrator calls `checkState()` at the top of its `while` loop (line 222).
If the frame it expects isn't ready (`frameReadyRing[ringIndex] === 0`), it `await`s `writerWaiterExecutor` and executes `continue`. When a worker completes a frame, it resolves `writerWaiterResolve`, waking up the main loop. The main loop loops back to the top and calls `checkState()` AGAIN.
However, `checkState()` is only responsible for assigning tasks to idle workers when pipeline capacity becomes available. Pipeline capacity ONLY becomes available when `nextFrameToWrite` increments. Waking up from `writerWaiterExecutor` does not change `nextFrameToWrite`. Thus, any `checkState()` call resulting from a `continue` is guaranteed to be a no-op that just wastes CPU cycles.

Solution:
Move the `checkState()` call from the top of the `while` loop to immediately AFTER `nextFrameToWrite++` at the bottom of the loop, and add one initial call before the `while` loop starts. This ensures `checkState()` is strictly called only when capacity opens up, eliminating redundant calls caused by orchestrator wakeups.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~4.169s
- **Bottleneck analysis**: Redundant synchronous loops taking CPU time away from Playwright IPC and frame processing.

## Implementation Spec

### Step 1: Optimize checkState Call Locations
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Move `checkState()` to be called once before the loop, and once at the bottom of the loop after `nextFrameToWrite++`.
```git
<<<<<<< SEARCH
    const workerPromises = this.pool.map((w, i) => runWorker(w, i));

    try {
        while (nextFrameToWrite < this.totalFrames && !aborted) {
            checkState();
            if (aborted) break;

            const ringIndex = nextFrameToWrite & ringMask;
=======
    const workerPromises = this.pool.map((w, i) => runWorker(w, i));

    checkState();
    try {
        while (nextFrameToWrite < this.totalFrames && !aborted) {
            if (aborted) break;

            const ringIndex = nextFrameToWrite & ringMask;
>>>>>>> REPLACE
```

```git
<<<<<<< SEARCH
            this.writeToStdin(buffer, this.handleWriteError);

            nextFrameToWrite++;
        }
    } catch (e) {
=======
            this.writeToStdin(buffer, this.handleWriteError);

            nextFrameToWrite++;
            checkState();
        }
    } catch (e) {
>>>>>>> REPLACE
```
**Why**: Ensures `checkState()` is evaluated only when it actually needs to distribute new tasks (after `nextFrameToWrite` increments and opens up pipeline capacity), rather than redundantly re-evaluating after every `continue`.
**Risk**: Negligible. State evaluation remains intact, just restricted to when changes actually occur.

## Variations
- None.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure the capture loop successfully processes all frames without deadlocking.
