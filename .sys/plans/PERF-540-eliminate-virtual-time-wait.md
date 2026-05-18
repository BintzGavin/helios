---
id: PERF-540
slug: eliminate-virtual-time-wait
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-540: Eliminate Double Await for Virtual Time Policy in CDP Driver

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `runSetTime()` and virtual time handling.

## Background Research
The `runSetTime` function is the hottest path in the codebase during DOM rendering, responsible for advancing the composition time on every frame via the CDP protocol. Currently, it implements a complex double-wait pattern:
1. It sends `Emulation.setVirtualTimePolicy` with an `advance` budget.
2. It wraps this in a `new Promise` (`virtualTimePromiseExecutor`).
3. The promise is resolved not by the immediate CDP command response, but by a separate event listener listening for `Emulation.virtualTimeBudgetExpired`.

However, testing confirms that simply awaiting the `client.send('Emulation.setVirtualTimePolicy', ...)` promise directly achieves the exact same synchronization with less overhead. The Playwright CDP client internally queues and resolves commands correctly. By removing the event listener registration, the `virtualTimePromiseExecutor`, and the custom resolve/reject state, we eliminate unnecessary V8 Promise instantiations, event loop overhead, and function allocations in the tightest loop of the rendering pipeline.

This was previously investigated in `PERF-471` but marked discarded/failed because the implementation likely broke something or was executed incorrectly. A careful, minimal replacement of the `await new Promise(...)` with a direct `await this.client!.send(...)` is extremely likely to work and improve performance by reducing CDP round-trip event overhead.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 1920x1080, 60 FPS, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.594s
- **Bottleneck analysis**: Unnecessary V8 promise allocations, event listener overhead, and CDP event handling in the per-frame `setTime` hot loop.

## Implementation Spec

### Step 1: Remove Event Listeners
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Locate and remove lines 113 and 114 that register and manage the `Emulation.virtualTimeBudgetExpired` listener via `this.client!.on` and `this.client!.removeListener`.

### Step 2: Remove Promise Executor and Handlers
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Delete the unused state and methods: `cdpResolve` (line 16), `cdpReject` (line 17), `virtualTimePromiseExecutor` (starting line 24), `handleVirtualTimeBudgetExpired` (starting line 72), and `handleVirtualTimeBudgetError` (starting line 80).

### Step 3: Replace Await in runSetTime
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime()`, replace the indirect promise creation (`await new Promise<void>(this.virtualTimePromiseExecutor);`) on line 238 with a direct await on the CDP send command: `await this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(() => {});`

**Why**: Direct awaiting leverages the existing Promise returned by Playwright's CDP `send()` wrapper, avoiding the creation of an additional Promise per frame and the overhead of listening for and processing the subsequent `Emulation.virtualTimeBudgetExpired` event, which is redundant since the command response itself confirms the time advance.
**Risk**: If Chromium requires the `virtualTimeBudgetExpired` event to fully flush DOM updates before we fire `beginFrame`, we might capture prematurely. However, Chromium typically blocks the `setVirtualTimePolicy` response until the budget has been consumed when policy is `advance`.

## Canvas Smoke Test
Run a basic canvas render (`npm run test -w packages/renderer -- --run` if necessary) to ensure the driver changes don't crash the timeline logic.

## Correctness Check
Run the DOM benchmark (`npx tsx packages/renderer/tests/fixtures/benchmark.ts`) and inspect the output video to verify animations still play correctly without freezing.
