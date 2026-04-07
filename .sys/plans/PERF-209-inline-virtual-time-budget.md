---
id: PERF-209
slug: inline-virtual-time-budget
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-209: Inline Virtual Time Budget Params in CdpTimeDriver

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` method.

## Background Research
In the `setTime` method of `CdpTimeDriver`, we advance virtual time by calculating a budget and passing an object literal to `this.client!.send('Emulation.setVirtualTimePolicy', { policy: 'advance' as const, budget: budget })`. This allocates a new object literal on every single frame, causing unnecessary garbage collection overhead in the hot loop. In `PERF-179`, a similar optimization was applied to pre-allocate or inline these parameters for `Emulation.setVirtualTimePolicy` when initializing it, and in `PERF-193` `beginFrameParams` was cached for `DomStrategy`. We should cache this object as a class property and mutate the `budget` property inside the loop to avoid dynamic object allocation.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s
- **Bottleneck analysis**: Object literal allocation per frame for `Emulation.setVirtualTimePolicy` causes minor GC pressure.

## Implementation Spec

### Step 1: Pre-allocate `setVirtualTimePolicyParams` in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a private property to the class:
   `private setVirtualTimePolicyParams: any = { policy: 'advance', budget: 0 };`
2. In the `setTime` method, update the `budget` property of the pre-allocated object and pass it to `send`:
   `this.setVirtualTimePolicyParams.budget = budget;`
   `this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(reject);`

**Why**: By caching the parameter object as a class property and mutating its `budget` field, we eliminate the need to allocate a new object literal on every frame, reducing V8 memory allocation and GC pressure in the hot loop.
**Risk**: Negligible.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to ensure virtual time continues to advance correctly.

## Prior Art
PERF-193, PERF-194, PERF-179 all optimize CDP arguments allocation in the hot loop.
