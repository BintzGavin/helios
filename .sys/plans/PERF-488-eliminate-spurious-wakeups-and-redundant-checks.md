---
id: PERF-488
slug: eliminate-spurious-wakeups-and-redundant-checks
status: unclaimed
claimed_by: ""
created: 2026-05-12
completed: ""
result: ""
---
# PERF-488: Eliminate Spurious Wakeups and Redundant Checks in CaptureLoop

## Focus Area
The `CaptureLoop` orchestrator in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the event loop Wakeup mechanisms (`writerWaiterResolve`) and the orchestrator state verification (`checkState()`).

## Background Research
The DOM capture pipeline utilizes an actor model with a pool of concurrent workers.
1. **Spurious Wakeups**: Currently, when any worker finishes capturing a frame, it unconditionally calls `writerWaiterResolve()` to unblock the main orchestration loop. However, since the workers run concurrently, frames frequently finish out of order. If the main loop is sleeping waiting specifically for `nextFrameToWrite` (e.g., frame 5), and a worker completes frame 6, the worker invokes `writerWaiterResolve()`. The main loop wakes up, checks `frameReadyRing[5]`, sees it is still `0`, and immediately goes back to sleep, creating a new Promise executor. This causes hundreds of unnecessary event loop microtasks, V8 Promise allocations, and context switches per render. Restricting the wakeup to only happen when `nextFrameToWrite === i` eliminates this overhead.
2. **Redundant Checks**: The `checkState()` function iterates through all workers to assign new tasks. Currently, it is called at the very end of the orchestration `while` loop, and then immediately called again at the top of the next iteration. Because there are no asynchronous yields between the bottom and the top of the loop, the second call is 100% synchronous and redundant, pointlessly consuming CPU cycles.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.515s (PERF-482)
- **Bottleneck analysis**: V8 event loop microtask overhead and redundant synchronous loops taking CPU time away from Playwright IPC and frame processing.

## Implementation Spec

### Step 1: Eliminate Spurious Wakeups
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function, modify the `writerWaiterResolve` invocation to only occur if the completed frame is exactly the one the main loop might be waiting for.
Change:
```typescript
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```
to:
```typescript
            if (writerWaiterResolve && nextFrameToWrite === i) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```
**Why**: This strictly avoids waking up the main loop for out-of-order frames, eliminating spurious Promise resolutions and V8 microtask overhead.
**Risk**: None. If `nextFrameToWrite` is later incremented and a future frame is already ready, the main loop checks `frameReadyRing` and skips sleeping entirely.

### Step 2: Remove Redundant `checkState()` Call
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the main orchestration `while` loop, remove the second `checkState()` call at the bottom.
Change:
```typescript
            this.writeToStdin(buffer, this.handleWriteError);

            nextFrameToWrite++;
            checkState(); // This will unblock a waiting worker if we just opened up pipeline capacity
        }
```
to:
```typescript
            this.writeToStdin(buffer, this.handleWriteError);

            nextFrameToWrite++;
        }
```
**Why**: The loop immediately iterates back to the top where `checkState()` is called unconditionally on the very next synchronous line of code. Removing the call at the bottom cuts the orchestrator's state-checking iterations in half.
**Risk**: None. If the loop terminates because `nextFrameToWrite === this.totalFrames`, there is already a fallback `checkState()` call outside the loop to handle final teardown.

## Variations
- None required. Both changes are deterministic micro-optimizations.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure FFmpeg successfully encodes all frames from the buffered pipe without deadlock.
