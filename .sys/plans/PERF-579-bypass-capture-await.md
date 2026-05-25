---
id: PERF-579
slug: bypass-capture-await
status: complete
claimed_by: "executor-session"
created: 2026-10-30
completed: 2026-05-25
result: failed
---

# PERF-579: Bypass `capture` Promise Await in Worker Run Loop

## Focus Area
`DomStrategy.ts` and `CdpTimeDriver.ts` hot loops.

## Background Research
In the multi-worker ACTOR MODEL implementation, `runWorker` awaits `timeDriver.setTime()` and `strategy.capture()`.
Because `strategy.capture(page, time)` ultimately calls Playwright's CDP `client.send(...)` which returns a Promise, we are awaiting that Promise directly. Every `await` in V8 introduces at least two microtask ticks and allocates a new Promise under the hood for resuming the generator context.
By removing the `async` wrapper on `capture()` and `runSetTime()` and returning the promises directly (using `.then()` for `capture`), we eliminate the V8 generator allocations for those functions, saving promise allocation overhead per frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 1920x1080, 60fps, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.436s
- **Bottleneck analysis**: V8 generator state machine allocations (`async`/`await`) in the per-frame `capture` and `runSetTime` methods.

## Implementation Spec

### Step 1: Remove `async`/`await` from `DomStrategy.capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Change `async capture(...)` to `capture(...)`.
Replace the `try/catch` block for the non-target case with:
```typescript
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(result => {
        if (result.screenshotData) {
          this.lastFrameData = result.screenshotData;
        }
        return this.lastFrameData!;
      })
      .catch(e => {
        return this.lastFrameData!;
      });
```
For the `targetElementHandle` block, ensure that if `boundingBox()` remains asynchronous, `capture` is kept synchronous by chaining `.then` or just focusing the optimization solely on the fast non-target case. The non-target case is the main hot path for standard DOM captures. If rewriting the entire target element handle path to use `.then()` chains is complex, the executor may instead simply remove `async` and use `.then()` chains for both.

### Step 2: Remove `async`/`await` from `CdpTimeDriver.runSetTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Change `private async runSetTime(...)` to `private runSetTime(...): Promise<void> | void`.
Remove `await new Promise<void>(this.virtualTimePromiseExecutor);` and replace it with:
```typescript
    this.currentTime = timeInSeconds;
    return new Promise<void>(this.virtualTimePromiseExecutor);
```
Ensure `this.currentTime = timeInSeconds;` happens *before* returning the promise.

**Why**: Returning the promise directly avoids the overhead of V8 wrapping the execution in an `async` generator, reducing memory allocations and microtask ticks per frame.
**Risk**: Error stack traces might be slightly harder to read, but functionally it is identical.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break Canvas compilation.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` and execute the benchmark.
## Results Summary
- **Best render time**: 1.361s (vs baseline 1.349s)
- **Improvement**: -0.89%
- **Kept experiments**: None
- **Discarded experiments**: Bypass capture Promise await
