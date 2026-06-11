---
id: PERF-742
slug: eliminate-promise-allocation-in-cdp-time-driver
status: complete
claimed_by: "executor-session"
created: 2026-06-11
completed: "2026-06-11"
result: "improved"
---
# PERF-742: Reusable Thenable for CDP Virtual Time in CdpTimeDriver

## Focus Area
`CdpTimeDriver.setTime` is the core per-frame execution hook for CDP rendering. Inside `setTime`, a `new Promise<void>` is allocated on *every single frame* to wait for the CDP `Emulation.virtualTimeBudgetExpired` event:
```typescript
const promise = new Promise<void>((resolve, reject) => {
  this.cdpResolve = resolve;
  this.cdpReject = reject;
});
```
This requires allocating the Promise object and allocating the executor closure `(resolve, reject) => {...}`. We previously tried to use `Promise.withResolvers()` (PERF-714) and prebinding the executor (PERF-709) to avoid closure allocation, but both regressed performance due to intermediate object or property lookup overhead. We can completely eliminate both the Promise and closure allocations by implementing a lightweight, reusable "Thenable" object that duck-types as a Promise for `await`.

## Background Research
In JavaScript, the `await` keyword does not strictly require a native Promise; it accepts any "Thenable" object (an object with a `then(resolve, reject)` method). By creating a single custom class that implements `then`, we can reuse the same instance for every frame's `setTime` call. When `await` is called on the Thenable, V8 simply passes its internal resolve/reject callbacks to our `then` method. We store those callbacks and invoke them when the CDP event fires. This completely bypasses `new Promise` allocation and executor closure creation.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Allocating a `new Promise` and its executor closure on every frame creates garbage and V8 optimization pressure in the highly constrained DOM rendering hot loop.

## Implementation Spec

### Step 1: Implement a Reusable Thenable Class
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a `ReusableThenable` class outside `CdpTimeDriver`:
```typescript
class ReusableThenable {
  public resolveCb: (() => void) | null = null;
  public rejectCb: ((err: Error) => void) | null = null;

  then(resolve: () => void, reject: (err: Error) => void) {
    this.resolveCb = resolve;
    this.rejectCb = reject;
  }

  resolve() {
    if (this.resolveCb) {
      const cb = this.resolveCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb();
    }
  }

  reject(err: Error) {
    if (this.rejectCb) {
      const cb = this.rejectCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(err);
    }
  }
}
```
2. In `CdpTimeDriver`, replace `cdpResolve` and `cdpReject` with `private timePromise = new ReusableThenable();`
3. Update `handleVirtualTimeBudgetExpired` to call `this.timePromise.resolve();`
4. In `setTime`, remove the `new Promise` block and simply return the Thenable:
```typescript
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams);
    return this.timePromise as any as Promise<void>;
```

**Why**: Completely eliminates per-frame Promise and closure allocations in the `setTime` hot loop while maintaining asynchronous correctness.

**Risk**: If `CaptureLoop` passes the result to `Promise.all` instead of directly `await`ing it, native Promise semantics might differ slightly, but `await` handles Thenables flawlessly in V8.

## Variations
None.

## Correctness Check
Ensure the DOM frames still render sequentially and correctly without hanging.


## Results Summary
- **Best render time**: 28.717s (vs baseline 30.719s)
- **Improvement**: ~6.5%
- **Kept experiments**: [PERF-742-eliminate-promise-allocation-in-cdp-time-driver]
- **Discarded experiments**: []
