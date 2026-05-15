---
id: PERF-507
slug: inline-stability-check
status: unclaimed
claimed_by: ""
created: 2024-05-15
completed: ""
result: ""
---

# PERF-507: Eliminate defaultStabilityCheck method and inline logic

## Focus Area
Eliminate the `.then()` promise chain and anonymous closure allocation inside the `CdpTimeDriver.ts` stability check. This targets the per-frame event loop microtask overhead during DOM capture.

## Background Research
The `defaultStabilityCheck` currently wraps the `Runtime.evaluate` call in a `.then()` to handle the result, creating a new promise and a closure on every frame. V8 can optimize this, but directly awaiting the CDP response inside the main `runSetTime` function avoids secondary Promise and closure allocations entirely. This is an identical implementation of `PERF-506` which was not implemented correctly in code (the plan said "complete" but `defaultStabilityCheck` is still in the code and used).

## Benchmark Configuration
- **Composition URL**: DOM benchmark composition
- **Render Settings**: 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.900s
- **Bottleneck analysis**: Microtask queue overhead from intermediate promise chains in the hot loop.

## Implementation Spec

### Step 1: Inline defaultStabilityCheck logic
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the `defaultStabilityCheck` method.
2. Inside `runSetTime`, replace the call to `defaultStabilityCheck` with an inline `await this.client!.send('Runtime.evaluate', this.evaluateStabilityParams)`.
3. Check the result of the `await` and call `this.handleStabilityCheckResponse(res)` if `res` exists.

**Why**: This avoids a `.then()` allocation and directly uses the V8 async/await state machine in the existing `runSetTime` async function, reducing GC churn.
**Risk**: Negligible risk.

## Correctness Check
Run the DOM benchmark (`npx tsx tests/fixtures/benchmark.ts`) and ensure it completes without hanging or errors, and that output looks correct.