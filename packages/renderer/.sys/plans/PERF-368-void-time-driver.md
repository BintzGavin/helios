---
id: PERF-368
slug: void-time-driver
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-368: Eliminate TimeDriver Promise Return Overhead

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `TimeDriver`, `SeekTimeDriver`, `CdpTimeDriver`, and `CaptureLoop.ts`.

## Background Research
In the multi-worker actor model, `CaptureLoop.ts` does the following for every frame:

```typescript
const timePromise = timeDriver.setTime(page, compositionTimeInSeconds);
if (timePromise) {
    timePromise.catch(noopCatch);
}
const buffer = await strategy.capture(page, time);
```

Currently `CdpTimeDriver.setTime` returns `Promise<void>`, but the `CaptureLoop` explicitly chooses NOT to await this promise so it can overlap the execution. In `CdpTimeDriver`, returning `Promise` causes V8 to allocate the Promise tracking structure, manage it across the `await` boundaries inside `setTime`, and finally the `CaptureLoop` just attaches a `.catch(noopCatch)` and throws it away. Since `CaptureLoop` doesn't await the `TimeDriver` (and instead relies on `strategy.capture()` natively resolving frame bounds, or internal drivers managing their own timeout mechanisms), returning a `Promise` from `setTime` only adds allocation overhead and microtask queue churn.

By updating the `TimeDriver` interface to explicitly allow returning `void`, and rewriting `CdpTimeDriver.setTime` so it returns `void` synchronously (by moving the async implementation to an internal helper and catching it inline without returning the Promise chain), we avoid Promise object allocation and the subsequent `timePromise.catch(noopCatch)` closure logic inside the hot loop. The `TimeDriver` handles its own rejections internally.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.058s
- **Bottleneck analysis**: Allocation of `Promise<void>` in `CdpTimeDriver`, plus dynamic branch `if (timePromise)` and `.catch()` evaluation inside the `CaptureLoop` hot path.

## Implementation Spec

### Step 1: Update TimeDriver interface
**File**: `packages/renderer/src/drivers/TimeDriver.ts`
**What to change**:
Confirm or change `setTime` return type to `Promise<void> | void`.

```typescript
  setTime(page: Page, timeInSeconds: number): Promise<void> | void;
```

### Step 2: Refactor `CdpTimeDriver.setTime` to return `void`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Change the signature of `setTime` from `async setTime(...)` to a synchronous `setTime(page: Page, timeInSeconds: number): void`.
Move the async logic into a separate internal async helper method called `_setTime` and handle the promise inline without returning it.

```typescript
<<<<<<< SEARCH
  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    const delta = timeInSeconds - this.currentTime;
=======
  setTime(page: Page, timeInSeconds: number): void {
    this._setTime(page, timeInSeconds).catch(() => {});
  }

  private async _setTime(page: Page, timeInSeconds: number): Promise<void> {
    const delta = timeInSeconds - this.currentTime;
>>>>>>> REPLACE
```

### Step 3: Eliminate `timePromise` allocation and branch in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Since all drivers now safely handle their own rejections and return `void`, we can completely eliminate the `timePromise` assignment, the conditional branch, and the `noopCatch` attachment from the hot loop.

```typescript
<<<<<<< SEARCH
            try {
                const timePromise = timeDriver.setTime(page, compositionTimeInSeconds);
                if (timePromise) {
                    timePromise.catch(noopCatch);
                }
                const buffer = await strategy.capture(page, time);
=======
            try {
                timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = await strategy.capture(page, time);
>>>>>>> REPLACE
```

**Why**: Removes the `if (timePromise)` branch evaluation and the `noopCatch` closure binding from executing 600 times a second inside the `CaptureLoop`, ensuring the JIT compiler has the straightest possible path.
**Risk**: None. The promise was already unobserved.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode still works.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` to verify DOM output is correct.
Run `npx tsx tests/verify-cdp-driver-stability.ts` to ensure CdpTimeDriver works.
