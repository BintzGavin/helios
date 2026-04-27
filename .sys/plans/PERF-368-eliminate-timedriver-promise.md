---
id: PERF-368
slug: eliminate-timedriver-promise
status: unclaimed
claimed_by: ""
created: 2024-05-01
completed: ""
result: ""
---

# PERF-368: Eliminate TimeDriver Promise Return Overhead

## Focus Area
The `TimeDriver.setTime()` method signature and its implementations in `CdpTimeDriver.ts` and `SeekTimeDriver.ts`. We want to change the `setTime` method to return `void` instead of `Promise<void>`, completely bypassing V8 Promise allocation and generator (`async`/`await`) overhead in the hot loop.

## Background Research
The DOM pipeline hot loop in `CaptureLoop.ts` does this for every frame:
```typescript
const timePromise = timeDriver.setTime(page, compositionTimeInSeconds);
if (timePromise) {
    timePromise.catch(noopCatch);
}
const buffer = await strategy.capture(page, time);
```

While `timeDriver.setTime()` is technically "fire and forget" here (we don't await the `timePromise`), the `CdpTimeDriver.setTime()` method is marked as `async`, meaning V8 still pays the overhead of allocating a `Promise` and setting up the generator state machine on every frame. `SeekTimeDriver` avoids this natively, but changing the interface and conforming `CdpTimeDriver` to fire and forget internally will optimize both code paths.
Specifically in `CdpTimeDriver`, the driver is `await`ing several internal steps (virtual time budget, CDP check response). We can push this internal `async` behavior into a non-blocking floating closure, allowing `setTime` to instantly return `void` and skip the top-level Promise creation in the hot loop entirely.

By having `setTime` return `void` natively, we bypass V8's GC overhead for allocating discarded `Promises` in `CaptureLoop`. Furthermore, `SeekTimeDriver` has a lingering `return;` that can be cleaned up along with the `catch(noopCatch)` in `CaptureLoop.ts`.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, 150 frames, dom mode, png intermediate format
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current best render time**: ~48.058s (PERF-366)

## Implementation Spec

### Step 1: Update `TimeDriver.ts` Interface
**File**: `packages/renderer/src/drivers/TimeDriver.ts`
**What to change**: Update `setTime` to purely return `void`:
`setTime(page: Page, timeInSeconds: number): void;`
**Why**: Avoid TypeScript forcing implementers to return a `Promise`.

### Step 2: Refactor `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**: Change `setTime` to return `void` instead of `Promise<void>`. Extract the actual logic into an internal async closure `this.runSetTime(page, timeInSeconds).catch(noopCatch)`.
**Why**: Moves the async boundary down a level and ensures the top-level hot loop doesn't track unawaited promises.

### Step 3: Clean up `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Remove the tracking of `timePromise`.
```typescript
timeDriver.setTime(page, compositionTimeInSeconds);
const buffer = await strategy.capture(page, time);
```
**Why**: Cleans up the hot loop by removing unnecessary conditional Promise tracking logic.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` and ensure benchmark render completes properly.
