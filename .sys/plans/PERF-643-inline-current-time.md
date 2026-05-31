---
id: PERF-643
slug: inline-current-time
status: complete
claimed_by: "executor-session"
created: 2024-05-31
completed: "2024-05-31"
result: failed
---

# PERF-643: Inline `currentTime` update into `handleVirtualTimeBudgetExpired`

## Focus Area
The `runSetTime` method in `CdpTimeDriver.ts` uses a `Promise` chain with `.then(() => { this.currentTime = timeInSeconds; })` to update the current time after `Emulation.setVirtualTimePolicy` resolves. This `.then()` callback allocates a closure on every frame iteration in the hot loop.

## Background Research
Memory context states: "PERF-642, an experiment to Eager Update of `currentTime` in `CdpTimeDriver` ... Attempted to eliminate the `.then()` chain in `runSetTime` by eagerly assigning `this.currentTime = timeInSeconds` right before sending the `Emulation.setVirtualTimePolicy` CDP command and directly returning the new Promise, aiming to bypass V8 microtask closure allocation overhead per frame. WHY it didn't work: The median render time did not improve ... V8 is likely already highly efficient at optimizing local closure execution and short `.then()` microtasks inside generator await loops."

Instead of eager update (which might have had subtle timing issues or Playwright event ordering), we can update `this.currentTime` directly inside `handleVirtualTimeBudgetExpired` right before we resolve the promise, passing `timeInSeconds` state down so we don't need the `.then()` chain in `runSetTime`.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Allocation of `.then` closure for every frame in `runSetTime`.

## Implementation Spec

### Step 1: Pass `timeInSeconds` to `virtualTimePromiseExecutor`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a private property `private nextTimeInSeconds: number = 0;` to `CdpTimeDriver`.
2. In `runSetTime`, set `this.nextTimeInSeconds = timeInSeconds;` before returning `new Promise<void>(this.virtualTimePromiseExecutor);`.
3. Remove the `.then(() => { this.currentTime = timeInSeconds; })` in `runSetTime` and just return the new Promise.
4. In `handleVirtualTimeBudgetExpired`, add `this.currentTime = this.nextTimeInSeconds;` right before calling `this.cdpResolve();`.

```typescript
  private handleVirtualTimeBudgetExpired = () => {
    if (this.cdpResolve) {
      this.currentTime = this.nextTimeInSeconds;
      this.cdpResolve();
      this.cdpResolve = null;
      this.cdpReject = null;
    }
  };
```

```typescript
  private runSetTime(page: Page, timeInSeconds: number): Promise<void> {
    const delta = timeInSeconds - this.currentTime;
    if (delta <= 0) {
        return Promise.resolve();
    }
    const budget = delta * 1000;
    if (this.hasMedia) {
      this.defaultSyncMedia();
    }
    this.setVirtualTimePolicyParams.budget = budget;
    this.nextTimeInSeconds = timeInSeconds;
    return new Promise<void>(this.virtualTimePromiseExecutor);
  }
```
**Why**: By storing the target time in a class property and updating it directly in the CDP event listener, we eliminate the need for the `.then()` closure allocation on every frame, reducing GC pressure and microtask overhead in the hot loop.
**Risk**: Minimal. The time is updated at exactly the same logical point (when the CDP event fires).

## Variations
### Variation A: Refactor `runSetTime` to use `async/await`
If the class property approach feels clunky, we could try using `async/await` instead of `.then()`.

## Canvas Smoke Test
Run a basic canvas render.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-media-sync-timing.ts` to ensure time advances correctly.

## Results Summary
- **Best render time**: 2.882s (vs baseline 2.780s)
- **Improvement**: -3.6%
- **Kept experiments**: []
- **Discarded experiments**: [Inline `currentTime` update into `handleVirtualTimeBudgetExpired`]
