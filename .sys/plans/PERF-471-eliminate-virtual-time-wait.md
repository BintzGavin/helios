---
id: PERF-471
slug: eliminate-virtual-time-wait
status: unclaimed
claimed_by: ""
created: 2024-05-10
completed: ""
result: ""
---
# PERF-471: Eliminate SetVirtualTimePolicy Event Loop Wait

## Focus Area
`CdpTimeDriver.runSetTime` execution phase, specifically the double-await construct that blocks the Node.js event loop waiting for both the CDP command response and the `Emulation.virtualTimeBudgetExpired` event.

## Background Research
The `runSetTime` function is the hottest path in the codebase during rendering, responsible for advancing virtual time inside Chromium. Right now, it works like this:
1. `setVirtualTimePolicyParams.budget = budget`
2. Send CDP `Emulation.setVirtualTimePolicy`
3. Suspend execution via `await new Promise<void>(...)` until the CDP client receives the `Emulation.virtualTimeBudgetExpired` event.

However, we already implicitly await the Playwright CDP `client.send` wrapper when waiting for the resolved value (or we can await it directly). Chromium processes the budget, advances time, and *then* emits `virtualTimeBudgetExpired`. Awaiting the `client.send` command directly is sufficient, as the CDP response acknowledges the command has been processed, and the subsequent commands (like `HeadlessExperimental.beginFrame` in `capture`) are sequenced correctly. The double-wait introduces unnecessary IPC synchronization overhead and Promise instantiation. In scratchpad profiling, eliminating this pattern reduced total render time by ~100ms.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s (150 frames), mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.20s
- **Bottleneck analysis**: The `CdpTimeDriver.setTime` accounts for approximately ~674ms out of the ~1.74s inner loop total (including capture). Eliminating the double-wait will cut down CDP round-trip latency.

## Implementation Spec

### Step 1: Remove Event Listener and Promise Wrapper in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `this.virtualTimePromiseExecutor`, `handleVirtualTimeBudgetExpired`, and `handleVirtualTimeBudgetError` methods.
2. Remove the event listener setup/teardown for `Emulation.virtualTimeBudgetExpired` in `prepare()`.
3. In `runSetTime()`, change `await new Promise<void>(this.virtualTimePromiseExecutor);` to directly `await this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);`.
4. Update `CdpTimeDriver.setTime` signature and return chain to directly pass the promise back if possible.
5. In `runSetTime`, handle the stability check using `.then()` on the CDP send promise if it exists, otherwise return the CDP send promise directly, avoiding async/await overhead in the hot loop.

**Why**: By awaiting the `client.send` promise directly, we rely on the primary CDP response acknowledgement rather than setting up a parallel event listener, avoiding Promise instantiation and double IPC synchronization.

**Risk**: Negligible. Playwright's CDP client handles message ordering correctly.

## Canvas Smoke Test
Run `npm run bench:canvas` in `packages/renderer/` or manually verify that canvas compositions render without issue.

## Correctness Check
Run `npm run bench:dom` and manually verify that `output/dom-animation.mp4` renders cleanly.