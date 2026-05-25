---
id: PERF-582
slug: inline-setTime-promise
status: complete
claimed_by: ""
created: 2024-05-25
completed: "2024-05-25"
result: "discard"
---

# PERF-582: Eliminate `.then()` Chain in CdpTimeDriver `runSetTime`

## Focus Area
`CdpTimeDriver.ts` capture hot loop.

## Background Research
In `CdpTimeDriver.ts`, advancing virtual time involves sending the CDP command `Emulation.setVirtualTimePolicy` and waiting for the `Emulation.virtualTimeBudgetExpired` event.
Currently, the `runSetTime` method creates a new Promise and immediately chains a `.then(() => { this.currentTime = timeInSeconds; })` to update the internal time state once the promise resolves. This `.then()` call allocates a new Promise and a closure function on every single frame loop iteration, increasing V8 garbage collection pressure and microtask overhead.
We can eliminate this chaining entirely by introducing a `private targetTime: number = 0;` property. By setting `this.targetTime = timeInSeconds;` inside `runSetTime` and updating `this.currentTime = this.targetTime;` directly inside the existing `handleVirtualTimeBudgetExpired` event handler (which resolves the base Promise), we can return the `new Promise(this.virtualTimePromiseExecutor)` directly without any `.then()` chain.

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

### Step 1: Eliminate `.then()` closure in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a new private property `private targetTime: number = 0;` to the `CdpTimeDriver` class.
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
**Why**: Eliminates the inline `() => { this.currentTime = timeInSeconds; }` closure and avoids chaining an extra `.then()` Promise per frame. This differs from PERF-581 because we are *not* touching `DomStrategy.ts` and not replacing `() => {}` with bound instance methods in the hot loop, but simply shifting the variable assignment to the existing event handler.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break Canvas compilation.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` and execute the benchmark.

## Prior Art
Builds on PERF-580, which eliminated the `async`/`await` generator state machines in these exact functions. This takes it a step further by eliminating the closures and trailing `.then()`/.`catch()` Promise chaining.

## Results Summary
| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|-----|---------------|--------|---------------|-------------|--------|-------------|
| 1   | 1.639         | 150    | 91.52         | 42.3        | discard | inlining setTime promise |
| 2   | 1.791         | 150    | 83.76         | 42.1        | discard | inlining setTime promise |
| 3   | 1.788         | 150    | 83.89         | 42.2        | discard | inlining setTime promise |
