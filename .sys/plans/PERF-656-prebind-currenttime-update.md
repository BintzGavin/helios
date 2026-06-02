---
id: PERF-656
slug: prebind-currenttime-update
status: complete
claimed_by: ""
created: 2024-06-02
completed: ""
result: ""
---

# PERF-656: Pre-bind `currentTime` Update Handler in `CdpTimeDriver.ts`

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
Currently, inside the `runSetTime` hot loop of `CdpTimeDriver`, we allocate an anonymous closure on every frame:
```typescript
return new Promise<void>(this.virtualTimePromiseExecutor).then(() => {
    this.currentTime = timeInSeconds;
});
```
In PERF-643, we tried moving this assignment into the CDP event listener, which disrupted V8's JIT optimization and caused a regression. In PERF-642, we tried eager assignment before the await, which also didn't improve things. However, we have not tried simply pre-binding the `.then` handler to maintain the exact same execution order and microtask timing while eliminating the anonymous closure allocation. By storing `timeInSeconds` in a class property `this.nextTimeInSeconds` and using a pre-bound arrow function `this.updateCurrentTime` for the `.then` handler, we can preserve the highly-optimized V8 Promise chain while removing the garbage collection pressure of per-frame closure allocations.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.600s
- **Bottleneck analysis**: Anonymous closure allocation overhead in the `runSetTime` CDP virtual time progression hot loop.

## Implementation Spec

### Step 1: Add `nextTimeInSeconds` and `updateCurrentTime` properties
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a new private property `nextTimeInSeconds = 0;`.
Add a new private property `updateCurrentTime = () => { this.currentTime = this.nextTimeInSeconds; };`.
Modify `runSetTime` to store `timeInSeconds` into `this.nextTimeInSeconds` and pass `this.updateCurrentTime` directly to `.then()`.

```typescript
<<<<<<< SEARCH
  private runSetTime(page: Page, timeInSeconds: number): Promise<void> | void {
    const delta = timeInSeconds - this.currentTime;

    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (delta <= 0) {
        return;
    }

    // Convert to milliseconds for CDP
    const budget = delta * 1000;

// 1. Synchronize media elements
    if (this.hasMedia) {
      this.defaultSyncMedia();
    }

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = budget;
    return new Promise<void>(this.virtualTimePromiseExecutor).then(() => {
        this.currentTime = timeInSeconds;
    });
  }
=======
  private nextTimeInSeconds: number = 0;

  private updateCurrentTime = () => {
    this.currentTime = this.nextTimeInSeconds;
  };

  private runSetTime(page: Page, timeInSeconds: number): Promise<void> | void {
    const delta = timeInSeconds - this.currentTime;

    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (delta <= 0) {
        return;
    }

    // Convert to milliseconds for CDP
    const budget = delta * 1000;

// 1. Synchronize media elements
    if (this.hasMedia) {
      this.defaultSyncMedia();
    }

    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    this.setVirtualTimePolicyParams.budget = budget;
    this.nextTimeInSeconds = timeInSeconds;
    return new Promise<void>(this.virtualTimePromiseExecutor).then(this.updateCurrentTime);
  }
>>>>>>> REPLACE
```

**Why**: Removes per-frame closure allocation while maintaining the exact execution order of the `setVirtualTimePolicy` Promise resolution.
**Risk**: Very low.

## Variations
None.

## Canvas Smoke Test
Run a canvas capture via `npx tsx packages/renderer/scripts/benchmark-perf.ts` if a canvas composition is available, or ensure tests pass.

## Correctness Check
Run the DOM render benchmark `npx tsx packages/renderer/scripts/benchmark-perf.ts` and verify output integrity. Run `npx tsx packages/renderer/tests/run-all.ts` to ensure no regressions.
