---
id: PERF-692
slug: avoid-capture-promise-boxing
status: unclaimed
claimed_by: ""
created: 2024-06-08
completed: ""
result: ""
---

# PERF-692: Avoid Capture Promise Boxing in Single Worker

## Focus Area
`CaptureLoop.ts` fast path execution loop, specifically the promise returning/awaiting logic for `setTime` and `strategy.capture`.

## Background Research
Currently in the single worker fast path:
```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
const buffer = setTimeResult
    ? await setTimeResult.then(() => strategy.capture(page, time))
    : await strategy.capture(page, time);
```

While we previously tried to optimize the `then()` closure allocation itself (which failed), there is another source of microtask overhead. If `setTimeResult` is void/undefined (which happens frequently if `delta <= 0` or in `SeekTimeDriver` sync paths), we fall back to:
`await strategy.capture(page, time)`

Because `strategy.capture()` returns a Promise, Node.js and V8 must "box" the awaited result in a microtask. If we refactor the loop to sequentially await without the ternary/`then` chaining, and avoid unneeded `await` operations if we can know `setTimeResult` is synchronously resolved, we could bypass unnecessary event loop ticks.

However, since `strategy.capture` is *always* async (in `DomStrategy`, it does a CDP send), we will always have to `await` it.

Let's target a different bottleneck: In `CdpTimeDriver.ts` `setTime` implementation.

```typescript
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
    return promise.then(() => {
      this.currentTime = timeInSeconds;
    });
```
This allocates `new Promise` and then `.then(...)` on every single frame.

If we instead prebind `this.cdpResolve` to an executor that updates `this.currentTime`, we can eliminate the chained `.then()` entirely.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/dom-benchmark.html`
- **Render Settings**: 1080p, 60fps, 10s (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.18s
- **Bottleneck analysis**: V8 Promise allocation and `.then` chaining overhead in `CdpTimeDriver`.

## Implementation Spec

### Step 1: Prebind the `cdpResolve` closure
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a class property:
```typescript
private targetTimeInSeconds: number = 0;
```

Update `handleVirtualTimeBudgetExpired` to automatically advance the time:
```typescript
  private handleVirtualTimeBudgetExpired = () => {
    if (this.cdpResolve) {
      this.currentTime = this.targetTimeInSeconds;
      this.cdpResolve();
      this.cdpResolve = null;
      this.cdpReject = null;
    }
  };
```

Update `runSetTime` to eliminate `.then()`:
```typescript
<<<<<<< SEARCH
    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = budget;
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
    return promise.then(() => {
      this.currentTime = timeInSeconds;
    });
=======
    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = budget;
    this.targetTimeInSeconds = timeInSeconds;
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
    return promise;
>>>>>>> REPLACE
```

**Why**: We return the base promise directly, eliminating the `.then()` closure microtask chain that happens 30-60 times a second for every frame rendering loop. `this.currentTime` is successfully updated when the CDP event triggers the pre-bound `handleVirtualTimeBudgetExpired` arrow function.
**Risk**: Very low. The state updates immediately before resolving the promise, preserving the exact same synchronous contract that the chained `.then()` provided, but without allocating an extra Promise object to wrap the thenable.

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run the DOM benchmark (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) and ensure output videos render correctly.

## Prior Art
- PERF-677: Attempted to eliminate the Promise chain by eagerly advancing `this.currentTime` and returning the base promise, but this disrupted the logic and caused regressions because time advanced before the CDP call resolved. This plan delays the time advancement to the CDP resolution callback natively, which correctly maintains the state flow without a `.then()` chain.
