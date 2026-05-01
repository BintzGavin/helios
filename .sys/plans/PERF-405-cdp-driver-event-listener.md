---
id: PERF-405
slug: cdp-driver-event-listener
status: unclaimed
claimed_by: ""
created: 2025-05-01
completed: ""
result: ""
---

# PERF-405: Eliminate `EventEmitter.once` Churn in CdpTimeDriver

## Focus Area
`CdpTimeDriver.ts` virtual time advancement hot loop. We want to eliminate dynamic event listener registration on every frame.

## Background Research
Currently, `CdpTimeDriver.ts` uses `this.client!.once('Emulation.virtualTimeBudgetExpired', ...)` inside the prebound `virtualTimePromiseExecutor` to listen for the CDP response when advancing virtual time. Node.js's `EventEmitter.once` allocates a wrapper closure and modifies the internal listeners array on every single frame. This adds unnecessary V8 garbage collection churn during the hot capture loop. Moving this to a single, statically registered `.on` listener that handles the event continuously will eliminate this allocation entirely.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~44.500s
- **Bottleneck analysis**: The `virtualTimePromiseExecutor` is called once per frame. `EventEmitter.once` allocates a wrapper object and splices an array twice per frame (once to add, once to remove). Eliminating this churn relieves GC pressure.

## Implementation Spec

### Step 1: Remove `.once` from the executor
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Inside `virtualTimePromiseExecutor`, remove the line:
`this.client!.once('Emulation.virtualTimeBudgetExpired', this.handleVirtualTimeBudgetExpired);`
**Why**: To prevent allocating a new event listener wrapper on every frame.
**Risk**: If the event fires and we aren't listening, the render hangs. (Mitigated by Step 2).

### Step 2: Add static `.on` listener in prepare()
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Inside `async prepare(page: Page): Promise<void>`, after `this.client` is initialized and existing listeners are removed (near line 92 where `this.client!.removeListener('Runtime.executionContextCreated', ...)` exists), add:
`this.client!.removeListener('Emulation.virtualTimeBudgetExpired', this.handleVirtualTimeBudgetExpired);`
`this.client!.on('Emulation.virtualTimeBudgetExpired', this.handleVirtualTimeBudgetExpired);`
**Why**: This registers the event listener exactly once per session. Since `handleVirtualTimeBudgetExpired` checks if `this.cdpResolve` is defined before calling it, it safely ignores unexpected events while correctly fulfilling the virtual time promise when active.
**Risk**: Potential memory leak if `CdpTimeDriver` instances multiply, but `removeListener` during `prepare` reuse handles this cleanly, similar to existing cleanup.

## Correctness Check
Run `npx tsx tests/verify-cdp-driver.ts` to verify that virtual time still advances correctly without timing out.
