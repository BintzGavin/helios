---
id: PERF-658
slug: inline-update-current-time-closure
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-658: Restore inline anonymous closure for updateCurrentTime

## Focus Area
`CdpTimeDriver.ts` hot loop `runSetTime`.

## Background Research
The `RENDERER-EXPERIMENTS.md` log for `PERF-656` states:
```
- **PERF-656**: Pre-bind currentTime Update Handler in CdpTimeDriver.ts
  - **What I tried**: Added `nextTimeInSeconds` and `updateCurrentTime` properties to `CdpTimeDriver` and updated `runSetTime` to use these instead of an anonymous closure for the promise resolution.
  - **Why it didn't work**: It caused a performance regression (median ~2.543s vs baseline ~2.261s). This indicates that shifting the state mutation into a pre-bound handler rather than an inline anonymous closure slightly disrupted V8's optimization of the async/await hot loop sequence or introduced additional scope resolution overhead.
```

However, examining the current codebase in `packages/renderer/src/drivers/CdpTimeDriver.ts`, we see that the changes from `PERF-656` were *not* reverted. The codebase currently contains:
```typescript
  private nextTimeInSeconds: number = 0;
  private updateCurrentTime = () => {
    this.currentTime = this.nextTimeInSeconds;
  };
```
and
```typescript
    this.nextTimeInSeconds = timeInSeconds;
    return new Promise<void>(this.virtualTimePromiseExecutor).then(this.updateCurrentTime);
```
Because `PERF-656` was evaluated as a regression but wasn't reverted properly by the executor, it is causing our current baseline to be slower.

This plan will officially revert the `PERF-656` changes, restoring the inline anonymous closure `() => { this.currentTime = timeInSeconds; }` inside `runSetTime`. This should restore our hot loop performance to the original `2.261s` baseline.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s duration, mp4/libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.543s (current codebase contains PERF-656 regression)
- **Bottleneck analysis**: The pre-bound handler `this.updateCurrentTime` introduces scope resolution overhead and defeats V8's fast-path microtask optimization compared to a small inline closure.

## Implementation Spec

### Step 1: Revert PERF-656 Regression in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `private nextTimeInSeconds: number = 0;` and `private updateCurrentTime = () => { this.currentTime = this.nextTimeInSeconds; };`.
2. In `runSetTime`, remove `this.nextTimeInSeconds = timeInSeconds;`.
3. In `runSetTime`, change the return statement from `return new Promise<void>(this.virtualTimePromiseExecutor).then(this.updateCurrentTime);` back to:
```typescript
    return new Promise<void>(this.virtualTimePromiseExecutor).then(() => {
        this.currentTime = timeInSeconds;
    });
```
**Why**: V8 strongly optimizes inline anonymous closures within async chains and hot loops. Pre-binding the state mutation disrupted this optimization and regressed performance. Reverting this restores the pipeline's peak speed.
**Risk**: Negligible. We are reverting a known regression to a previously stable, faster state.

## Canvas Smoke Test
Run `npx tsx tests/run-all.ts` to ensure no functionality is broken.

## Correctness Check
Run the DOM benchmark. Render output should be valid and identical, but wall-clock time should drop back to ~2.261s.
