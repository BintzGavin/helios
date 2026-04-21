---
id: PERF-323
slug: void-time-driver
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-323: Eliminate TimeDriver Promise Return Overhead

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `TimeDriver`, `SeekTimeDriver`, `CdpTimeDriver`, and `CaptureLoop.ts`.

## Background Research
In the multi-worker actor model, `CaptureLoop.ts` does the following for every frame:

```typescript
timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);
const buffer = await strategy.capture(page, time);
```

Because `CaptureLoop` intentionally does not `await` the result of `setTime`, the `Promise` returned by `setTime` is immediately discarded after attaching a catch handler.

In `SeekTimeDriver.ts`, this means we are returning `Promise.all(promises)` (or a single promise) on every frame. V8 allocates these Promises, tracks them, resolves them, and triggers microtasks for the `.then` handlers, all of which are ultimately ignored by the renderer.

If we change the `TimeDriver` interface so that `setTime` can return `void` (by handling its own errors via inline `.catch()`), we completely eliminate the `Promise.all` allocation in `SeekTimeDriver.ts`, the return promise allocation, and the `.then` closure allocation in `CaptureLoop.ts`.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html`
- **Render Settings**: Baseline identical settings across all runs, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.1s
- **Bottleneck analysis**: Microtask and Promise allocation overhead in the hot loop for tracking unobserved asynchronous CDP commands.

## Implementation Spec

### Step 1: Update TimeDriver interface
**File**: `packages/renderer/src/drivers/TimeDriver.ts`
**What to change**:
Change `setTime` return type to `Promise<void> | void`.

```typescript
  setTime(page: Page, timeInSeconds: number): Promise<void> | void;
```

### Step 2: Return void from SeekTimeDriver and CdpTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Update `setTime` to return `void`. Handle the `catch` inline using the globally pre-bound `noopCatch`. Remove `Promise.all(promises)`.

```typescript
<<<<<<< SEARCH
  setTime(page: Page, timeInSeconds: number): Promise<void> {
    const frames = this.cachedFrames;

    if (frames.length === 1) {
      this.evaluateParams.expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
      return this.cdpSession!.send('Runtime.evaluate', this.evaluateParams) as Promise<any>;
    }

    const promises = this.cachedPromises;
    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';

    for (let i = 0; i < this.executionContextIds.length; i++) {
      promises[i] = this.cdpSession!.send('Runtime.evaluate', {
        expression: expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      });
    }

    return Promise.all(promises) as unknown as Promise<void>;
  }
=======
  setTime(page: Page, timeInSeconds: number): void {
    const frames = this.cachedFrames;

    if (frames.length === 1) {
      this.evaluateParams.expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
      this.cdpSession!.send('Runtime.evaluate', this.evaluateParams).catch(noopCatch);
      return;
    }

    const expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';

    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.cdpSession!.send('Runtime.evaluate', {
        expression: expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      }).catch(noopCatch);
    }
  }
>>>>>>> REPLACE
```

*(Note: Ensure `const noopCatch = () => {};` is imported or defined at the top of `SeekTimeDriver.ts` and `CdpTimeDriver.ts`)*

Do the same for `CdpTimeDriver.ts`:
```typescript
<<<<<<< SEARCH
  setTime(page: Page, timeInSeconds: number): Promise<void> {
    const timeInMs = timeInSeconds * 1000;
    this.evaluateParams.expression = 'window.__helios_seek(' + timeInMs + ')';
    return this.cdpSession!.send('Runtime.evaluate', this.evaluateParams) as Promise<any>;
  }
=======
  setTime(page: Page, timeInSeconds: number): void {
    const timeInMs = timeInSeconds * 1000;
    this.evaluateParams.expression = 'window.__helios_seek(' + timeInMs + ')';
    this.cdpSession!.send('Runtime.evaluate', this.evaluateParams).catch(noopCatch);
  }
>>>>>>> REPLACE
```

### Step 3: Remove .then() allocation in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the `setTime` invocation to just call the method without `.then()`, since errors are now handled internally by the drivers.
Handle cases where `setTime` still returns a Promise (for other drivers or backwards compatibility) using a simple truthy check to avoid `.then` allocation on `void`.

```typescript
<<<<<<< SEARCH
            try {
                timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);
                const buffer = await strategy.capture(page, time);
=======
            try {
                const timePromise = timeDriver.setTime(page, compositionTimeInSeconds);
                if (timePromise) {
                    timePromise.catch(noopCatch);
                }
                const buffer = await strategy.capture(page, time);
>>>>>>> REPLACE
```

**Why**: Returning `void` and using an inline pre-allocated catch handler completely bypasses V8 Promise array allocation, `.all()` aggregation, and `.then()` closure creation, streamlining the hot path.
**Risk**: None. The promise was already unobserved.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM output is correct.
