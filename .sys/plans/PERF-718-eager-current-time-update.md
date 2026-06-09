---
id: PERF-718
slug: eager-current-time-update
status: unclaimed
claimed_by: ""
created: 2024-06-10
completed: ""
result: ""
---

# PERF-718: Eager Current Time Update in CdpTimeDriver

## Focus Area
`CdpTimeDriver.ts` hot loop - `runSetTime` and `handleVirtualTimeBudgetExpired`.

## Background Research
Currently, `runSetTime` calculates a `delta` time, multiplies it by 1000 to get `budget`, stores `timeInSeconds` into a class property `this.targetTimeInSeconds`, and fires a CDP request. When the CDP response triggers `handleVirtualTimeBudgetExpired`, it reads `this.targetTimeInSeconds` and assigns it to `this.currentTime`.

Since `runSetTime` is sequentially awaited by the `CaptureLoop`, we can safely calculate `budget` inline, eagerly update `this.currentTime` immediately in the synchronous path, and eliminate the intermediate `this.targetTimeInSeconds` property altogether. This removes an intermediate local variable allocation, removes a property from the class instance (reducing memory footprint), and removes a property assignment from the async callback context, simplifying V8's bytecode execution in the hot path.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-benchmark`
- **Render Settings**: 1920x1080, 60fps, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s (from previous experiments).
- **Bottleneck analysis**: Micro-optimizations to reduce object size and bytecode instructions in the single-worker fast path.

## Implementation Spec

### Step 1: Eliminate targetTimeInSeconds and eagerly update currentTime
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the declaration `private targetTimeInSeconds: number = 0;`.
2. Update `handleVirtualTimeBudgetExpired` to no longer assign `this.currentTime = this.targetTimeInSeconds;`.
3. In `runSetTime`, replace `const delta = ...` and `const budget = delta * 1000;` with inline `const budget = (timeInSeconds - this.currentTime) * 1000;`.
4. In `runSetTime`, assign `this.currentTime = timeInSeconds;` immediately instead of assigning `targetTimeInSeconds`.

**Why**: Simplifies the class structure, reduces property allocations, and shifts property assignment out of the async execution context, giving V8 less state to track.
**Risk**: If Playwright fires `virtualTimeBudgetExpired` events out of order or if `runSetTime` were called concurrently, this could cause state desync. However, the `CaptureLoop` strictly awaits the promise before calling `runSetTime` again.

## Variations
None.

## Canvas Smoke Test
`npm run test -w packages/renderer` - verify no breakages.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npm run build && npx tsx scripts/benchmark-perf.ts` and verify the output mp4 visually.
