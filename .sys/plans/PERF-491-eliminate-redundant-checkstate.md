---
id: PERF-491
slug: eliminate-redundant-checkstate
status: complete
claimed_by: "executor-session"
created: 2026-05-13
completed: "2026-05-13"
result: "discarded"
---
# PERF-491: Eliminate Redundant `checkState()` Calls in CaptureLoop

## Focus Area
The actor model orchestrator loop (`CaptureLoop.ts`).

## Background Research
In `packages/renderer/src/core/CaptureLoop.ts`, the `checkState()` function is called redundantly. In the main orchestration loop (`while (nextFrameToWrite < this.totalFrames && !aborted)`), it is called at the top of the loop (line 238) and at the bottom of the loop (line 270) after `nextFrameToWrite++`. This causes the orchestrator to perform back-to-back synchronous `O(N)` scans over the `workerBlockedResolves` array without any intervening asynchronous yields, unnecessarily burning CPU cycles.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.515s
- **Bottleneck analysis**: Synchronous loop overhead consuming CPU time in V8 on the main event loop.

## Implementation Spec

### Step 1: Remove Redundant `checkState()` Call
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the main orchestration `while (nextFrameToWrite < this.totalFrames && !aborted)` loop (starting at line 237), remove the `checkState()` call at the bottom of the loop (line 270) that occurs immediately after `nextFrameToWrite++`. Let the `checkState()` call at the top of the loop (line 238) handle the state verification for the next iteration.

**Why**: The loop immediately iterates back to the top where `checkState()` is called unconditionally on the very next synchronous line of code. Removing the call at the bottom cuts the orchestrator's state-checking iterations in half.
**Risk**: Negligible. State evaluation remains intact at the top of every loop iteration.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure the capture loop successfully processes all frames without deadlocking.
## Results Summary
- **Best render time**: ~2.158s (already implemented)
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: PERF-491 (already implemented)
