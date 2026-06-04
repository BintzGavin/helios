---
id: PERF-676
slug: bypass-virtual-time-budget-assignment
status: unclaimed
claimed_by: ""
created: 2024-06-05
completed: ""
result: ""
---

# PERF-676: Bypass Property Allocation for Virtual Time Policy Budget

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
In the hot `runSetTime()` loop:
```typescript
    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = budget;
```
Here, `this.setVirtualTimePolicyParams` is modified on every frame to set the `budget`. However, since `budget` is almost always a constant across all frames for a fixed framerate (e.g., `budget = (1/30)*1000 = 33.333333333333336`), modifying the `setVirtualTimePolicyParams` object continuously forces V8 to update the object's properties. By adding a simple check to skip this assignment if the budget hasn't changed, we can reduce property write overhead in the hot loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s
- **Bottleneck analysis**: Property assignment overhead in the `runSetTime` CDP virtual time progression hot loop.

## Implementation Spec

### Step 1: Bypass property assignment if unchanged
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Modify `runSetTime` to only update the `budget` property if the value has changed:

```typescript
<<<<<<< SEARCH
    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = budget;
    const promise = new Promise<void>((resolve, reject) => {
=======
    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    if (this.setVirtualTimePolicyParams.budget !== budget) {
      this.setVirtualTimePolicyParams.budget = budget;
    }
    const promise = new Promise<void>((resolve, reject) => {
>>>>>>> REPLACE
```

**Why**: Removes a redundant property assignment inside a very hot loop. While V8 is fast at property assignments, eliminating it entirely when the value is unchanged saves CPU cycles.
**Risk**: Functionally identical. No risk.

## Variations
None.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts` and verify output integrity.
