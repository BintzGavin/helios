---
id: PERF-203
slug: inline-time-driver
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-203: Inline TimeDriver.setTime arguments

## Focus Area
DOM Rendering Pipeline (`packages/renderer/src/drivers/SeekTimeDriver.ts`)

## Background Research
In `SeekTimeDriver.ts`, inside the hot-loop method `setTime`, we are passing an object for `Runtime.callFunctionOn` stored in `this.callParams`. Mutating property `arguments[0].value` of an object that is persistent might add overhead. It's often more performant to pass the arguments directly inline, or keep mutation, but we should profile if `callParams` mutation vs inline parameters affects speed. Actually, previously PERF-191 improved speed by removing default arguments and inline allocating, while PERF-194 improved by caching. Wait, PERF-202 caches `callParams`. We can try removing `returnByValue: false` from `callParams` (actually already done via executor memory), but maybe we can just inline the array for `arguments` or bypass the array entirely if `Runtime.evaluate` is faster? No, `Runtime.callFunctionOn` is faster. We should see if inlining `[ { value: timeInSeconds }, { value: this.timeout } ]` for `arguments` is faster than mutating.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s
- **Bottleneck analysis**: In `SeekTimeDriver.ts`, inside the hot-loop method `setTime`, mutating property `arguments[0].value` of an object that is persistent.

## Implementation Spec

### Step 1: Inline arguments array
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Inside `setTime`, replace `this.callParams.arguments[0].value = timeInSeconds;` with dynamically creating the `arguments` array like `arguments: [ { value: timeInSeconds }, { value: this.timeout } ]` directly in the `send` payload, or spread.
**Why**: Tests V8 allocation speed for arrays vs property mutation.
**Risk**: Negligible.

## Variations
- **Variation A**: Attempt to pass the function via `Runtime.evaluate` by evaluating a closure generator once, storing the `objectId` of the returned function, and then calling `Runtime.callFunctionOn` on that function directly without `window` binding.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` (or similar seek test) to verify DOM fallback capture succeeds.

## Prior Art
- PERF-191 inline seek time driver params
- PERF-194 preallocate seek evaluate
- PERF-202 sync seek driver
