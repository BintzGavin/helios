---
id: PERF-581
slug: prebind-capture-promises
status: complete
claimed_by: "executor-session"
created: 2024-05-25
completed: "2024-05-25"
result: "discarded"
---

# PERF-581: Prebind Promises and Eliminate Closures in Capture Hot Loop

## Focus Area
`DomStrategy.ts` and `CdpTimeDriver.ts` capture hot loops.

## Background Research
In the renderer's hot loop, the V8 engine evaluates thousands of frames. Within `DomStrategy.ts` and `CdpTimeDriver.ts`, closures and Promise chains are constructed dynamically on every frame loop iteration.
Specifically:
1. `DomStrategy.capture()` uses `.then(result => { ... }).catch(e => { ... })`, which allocates two closure functions and chains two Promises (since `.catch` allocates another Promise) per frame.
2. `CdpTimeDriver.runSetTime()` uses `.then(() => { this.currentTime = timeInSeconds; })`, allocating a closure and an additional Promise layer in the chain.

By pre-allocating the success and error handlers as class properties and manually advancing the `currentTime` state within the existing CDP event listener (`handleVirtualTimeBudgetExpired`), we can eliminate these per-frame memory allocations and reduce the number of Promises created and resolved in the hot loop. This decreases garbage collection pressure and minimizes microtask ticks.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 1920x1080, 60fps, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.427s (PERF-580)
- **Bottleneck analysis**: V8 garbage collection and Promise chaining overhead from inline closures in the capture hot path.

## Implementation Spec

### Step 1: Prebind CDP capture handlers in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add two private arrow functions to the `DomStrategy` class:
   ```typescript
   private handleBeginFrameSuccess = (result: any) => {
     if (result && result.screenshotData) {
       this.lastFrameData = result.screenshotData;
     }
     return this.lastFrameData!;
   };

   private handleBeginFrameError = (e: any) => {
     return this.lastFrameData!;
   };
   ```
2. Update the fallback `capture` method block (when `this.targetElementHandle` is not set) to use these prebound handlers with a single `.then` call:
   ```typescript
   return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
     .then(this.handleBeginFrameSuccess, this.handleBeginFrameError);
   ```
3. Do the same for the `this.targetElementHandle` block inside the boundingBox promise.

**Why**: Avoids creating new `result =>` and `e =>` closure functions per frame, and reduces the Promise chain length by using the two-argument `.then(onFulfilled, onRejected)` instead of `.then().catch()`.

### Step 2: Eliminate `.then()` closure in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a new private property `private targetTime: number = 0;` to the class.
2. Update `handleVirtualTimeBudgetExpired`:
   ```typescript
   private handleVirtualTimeBudgetExpired = () => {
     this.currentTime = this.targetTime;
     if (this.cdpResolve) {
       this.cdpResolve();
       this.cdpResolve = null;
       this.cdpReject = null;
     }
   };
   ```
3. Update `runSetTime` to set `this.targetTime = timeInSeconds;` and return the Promise directly without the `.then()` chain:
   ```typescript
   private runSetTime(page: Page, timeInSeconds: number): Promise<void> {
     const delta = timeInSeconds - this.currentTime;
     if (delta <= 0) {
         return Promise.resolve();
     }
     const budget = delta * 1000;
     if (this.syncMediaState === 1 && this.hasMedia) {
       this.defaultSyncMedia(timeInSeconds);
     }
     this.targetTime = timeInSeconds;
     this.setVirtualTimePolicyParams.budget = budget;
     return new Promise<void>(this.virtualTimePromiseExecutor);
   }
   ```
**Why**: Eliminates the inline `() => { this.currentTime = timeInSeconds; }` closure and avoids chaining an extra `.then()` Promise per frame.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break Canvas compilation.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` and execute the benchmark.

## Prior Art
Builds on PERF-580, which eliminated the `async`/`await` generator state machines in these exact functions. This takes it a step further by eliminating the closures and trailing `.then()`/.`catch()` Promise chaining.

## Results Summary
- **Best render time**: 1.477s (median 1.516s)
- **Improvement**: Regressed compared to baseline (~1.427s)
- **Kept experiments**: None
- **Discarded experiments**: Prebind CDP capture handlers and eliminate closures in `DomStrategy.ts` and `CdpTimeDriver.ts`. Reason: Indirect function execution contexts slightly slowed down Promise resolution compared to V8's highly optimized inline closures.
