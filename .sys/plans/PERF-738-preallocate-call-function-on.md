---
id: PERF-738
slug: preallocate-call-function-on
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-738: Use `Runtime.callFunctionOn` Instead of `Runtime.evaluate` in `SeekTimeDriver`

## Focus Area
The `setTime` hot loop and class properties in `SeekTimeDriver.ts`. We want to eliminate string concatenation per frame.

## Background Research
Currently, `SeekTimeDriver.setTime` falls back to `Runtime.evaluate` with dynamic string concatenation for multi-frame execution and for single-frame executions when `windowObjectId` is absent.
This forces V8 (Chromium) to parse and compile the new string expression into bytecode on every single frame, plus incurs Node.js string memory allocation/GC overhead.
However, CDP `Runtime.callFunctionOn` accepts `executionContextId` instead of `objectId`. By migrating `multiFrameEvaluateParams` from `Runtime.evaluate` payloads to `Runtime.callFunctionOn` payloads with an `executionContextId`, we can completely eliminate string concatenation per frame on the Node.js side, AND bypass JS script compilation on the Chromium side. We just pass the numeric values directly.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.48s
- **Bottleneck analysis**: String allocation, GC pressure, and V8 parsing overhead in Chromium during the per-frame hot loop.

## Implementation Spec

### Step 1: Optimize `multiFrameEvaluateParams` and simplify single-frame
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Rename `multiFrameEvaluateParams` to `multiFrameCallParams`.
2. Delete `singleFrameEvaluateParams` and `windowObjectId`.
3. In `prepare()`, remove the attempt to fetch `window` object ID entirely.
4. Modify `setTime` to only use `Runtime.callFunctionOn` with `executionContextIds`.

**Why**: Using `callFunctionOn` with pre-allocated payloads eliminates per-frame string concatenation and avoids recompiling JavaScript in the browser. Using `executionContextIds` array for both single and multi-frame unifies branching and removes `cachedFrames` and `windowObjectId` tracking.
**Risk**: Low.

## Correctness Check
Run the `dom` benchmark and verify output video generation completes successfully.
