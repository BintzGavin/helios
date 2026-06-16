---
id: PERF-782
slug: bypass-cdptime-driver-budget-assignment
status: complete
claimed_by: "jules"
created: 2026-06-16
completed: 2026-06-16
result: "discard"
---

# PERF-782: Bypass virtualTimeBudget parameter assignment in CdpTimeDriver

## Focus Area
The `CdpTimeDriver.setTime()` method, which is executed for every single frame within the `CaptureLoop.ts` innermost fast-path.

## Background Research
Currently, `CdpTimeDriver.setTime()` calculates `const delta = timeInSeconds - this.currentTime`, followed by `this.setVirtualTimePolicyParams.budget = delta * 1000;`.
Because `timeInSeconds` is derived from floating-point arithmetic in `CaptureLoop.ts` (`compTimesArray[i] = i * compTimeStep`), the resulting `delta * 1000` is subject to IEEE 754 precision drift, creating many slightly unique budget values (e.g., `33.333333333333215`, `33.333333333333655`, etc.).

Since Chromium's Emulation.setVirtualTimePolicy budget behaves reliably even if we aggressively round the input budget at the Node IPC layer, we can round `budget = Math.round(delta * 1000)` to force it into a strictly stable integer (`33`). Once rounded, the value will be identical for >99% of frames. By caching this integer, we can bypass writing to the `this.setVirtualTimePolicyParams.budget` object property and bypass internal V8 object mutation overhead for nearly every frame.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s (baseline fast path)
- **Bottleneck analysis**: The object property mutation (`this.setVirtualTimePolicyParams.budget = ...`) dirties the V8 inline cache slightly. Bypassing it makes the operation purely a local integer check and an unmutated object reference passing to the IPC client.

## Implementation Spec

### Step 1: Add cache and round budget calculation
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a property `private lastBudget: number = -1;` to `CdpTimeDriver`.
2. Inside `setTime(page: Page, timeInSeconds: number)`:
   - Calculate the integer budget: `const budget = Math.round(delta * 1000);`.
   - Add a fast-path branch: `if (budget !== this.lastBudget)`.
   - Inside the branch, assign it: `this.setVirtualTimePolicyParams.budget = budget;` and `this.lastBudget = budget;`.
   - Update `this.currentTime = timeInSeconds;` as usual.
   - Send the IPC command: `this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);`
**Why**: Ensures `budget` evaluates to a strictly stable value (e.g. `33`), allowing `budget !== this.lastBudget` to evaluate to `false` for almost every frame, skipping the property mutation entirely.
**Risk**: If `Math.round` truncates fractional milliseconds in a way that cumulatively desyncs the virtual clock, Chromium might drift from the intended `timeInSeconds`. However, `Emulation.setVirtualTimePolicy` merely un-pauses the clock for a *budgeted duration* from its *current paused point*, while `this.currentTime` tracks the absolute global time accurately in Node.js.

## Variations
None.

## Canvas Smoke Test
Run `npm run test` to ensure basic functionality is not broken.

## Correctness Check
Run the DOM benchmark. Ensure the video isn't structurally desynced and that it reports exactly 150 frames.

## Prior Art
- PERF-777: Bypassing stream state getter to avoid property access overhead in hot loop.
- PERF-769: Minimizing CDP Message Payloads by caching object shapes.

## Results
- **Outcome**: discard
- **Median Time**: 2.262s
