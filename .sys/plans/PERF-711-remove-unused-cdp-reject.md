---
id: PERF-711
slug: remove-unused-cdp-reject
status: complete
claimed_by: "jules"
created: 2024-06-08
completed: "2026-06-08"
result: "discard"
---

# PERF-711: Clean up unused cdpReject in CdpTimeDriver

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
In PERF-706, we successfully removed the `.catch()` clause attached to `Emulation.setVirtualTimePolicy` inside `CdpTimeDriver.ts`. This successfully eliminated unhandled rejection closures from the hot path. However, the `cdpReject` property assignment inside the `new Promise` executor was left over and is now dead code. We continue to allocate a closure with `(resolve, reject)` and perform property assignments (`this.cdpReject = reject`) and nullifications on every frame. By removing this dead code, we slightly reduce GC pressure and property access overhead in the V8 hot loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s

## Implementation Spec

### Step 1: Remove cdpReject
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
- Remove `private cdpReject: ((err: Error) => void) | null = null;`.
- Remove `this.cdpReject = null;` from `handleVirtualTimeBudgetExpired`.
- Remove `reject` parameter and `this.cdpReject = reject;` from `new Promise` inside `runSetTime`.

**Why**: Eliminates unused variables and assignments, marginally reducing GC pressure on every frame.
**Risk**: Low.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas renders complete successfully without regressions.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to verify correct output without regressions.

## Prior Art
Builds directly on PERF-706.

## Results Summary
- **Best render time**: ~2.638s (vs baseline ~2.115s)
- **Improvement**: -24.73%
- **Kept experiments**: none
- **Discarded experiments**: PERF-711
