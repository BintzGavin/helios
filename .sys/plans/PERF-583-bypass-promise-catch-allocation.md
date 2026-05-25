---
id: PERF-583
slug: bypass-promise-catch-allocation
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-583: Eliminate `.catch()` Promise Chaining in CdpTimeDriver Executor

## Focus Area
`CdpTimeDriver.ts` virtual time promise executor hot loop.

## Background Research
In `CdpTimeDriver.ts`, advancing virtual time involves sending the CDP command `Emulation.setVirtualTimePolicy` inside `virtualTimePromiseExecutor`:
```typescript
this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
```
Playwright's `CDPSession.send()` returns a Promise. When we call `.catch(this.handleVirtualTimeBudgetError)` on it, V8 allocates a new Promise object to represent the next step in the chain. Since this happens on every single frame loop iteration for every worker, it generates unnecessary GC pressure and microtask ticks.
We can eliminate the trailing `.catch()` Promise allocation by removing the error handler entirely from the hot loop. If the CDP session disconnects or crashes, the Playwright page error/crash handlers in `BrowserPool.ts` (lines 128-136) will catch the failure and abort the job globally, making the per-frame `.catch()` redundant.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 1920x1080, 60fps, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.427s (PERF-580)
- **Bottleneck analysis**: V8 garbage collection and Promise chaining overhead in the capture hot path.

## Implementation Spec

### Step 1: Eliminate `.catch()` chain in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Change `virtualTimePromiseExecutor` to remove `.catch(this.handleVirtualTimeBudgetError)`:
```typescript
private virtualTimePromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => {
  this.cdpResolve = resolve;
  this.cdpReject = reject;

  // Skip attaching a .catch() to avoid Promise allocation on every frame.
  // If the CDP session disconnects, the page 'crash' handler will abort the job anyway.
  this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
};
```

**Why**: Eliminates a Promise allocation on every single frame loop iteration by trusting the global process crash handler for catastrophic CDP disconnects.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break Canvas compilation.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` and execute the benchmark.

## Prior Art
Builds on PERF-580, which eliminated the `async`/`await` generator state machines. This removes the final trailing `.catch()` Promise chain allocation.
