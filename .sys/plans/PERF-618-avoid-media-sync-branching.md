---
id: PERF-618
slug: avoid-media-sync-branching
status: complete
claimed_by: "Jules"
created: 2024-05-29
completed: "2024-05-29"
result: "discarded"
---

# PERF-618: Avoid Media Sync Branching

## Focus Area
DOM Rendering Pipeline - Hot loop branch elimination in `CdpTimeDriver.ts` (`runSetTime` function).

## Background Research
Currently in `CdpTimeDriver.ts`, the hot loop checks if it should run media sync on every single frame:
```typescript
// 1. Synchronize media elements
if (this.syncMediaState === 1 && this.hasMedia) {
  this.defaultSyncMedia();
}

// 2. Advance virtual time
```
`this.syncMediaState` and `this.hasMedia` are established once during the `prepare()` phase and never change. Checking this condition every frame adds branch prediction overhead inside the `runSetTime` hot loop. We can eliminate this branch entirely by dynamically modifying the `runSetTime` method prototype based on whether the composition has media or not, eliminating the boolean check entirely.

## Benchmark Configuration
- **Composition URL**: N/A (will use `benchmark-perf.ts`)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s (from RENDERER-EXPERIMENTS.md baseline)
- **Bottleneck analysis**: The `runSetTime` hot loop is executed per frame across all workers. Minimizing boolean branch evaluations in this tight loop could reduce V8 CPU instruction overhead.

## Implementation Spec

### Step 1: Eliminate the Branch in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Replace `private runSetTime` with a mutable property: `private runSetTimeFn: (page: Page, timeInSeconds: number) => Promise<void> = this.runSetTimeWithMedia.bind(this);`
2. Define two new variants for `runSetTime`:
   ```typescript
   private runSetTimeWithMedia(page: Page, timeInSeconds: number): Promise<void> {
       const delta = timeInSeconds - this.currentTime;
       if (delta <= 0) return Promise.resolve();
       const budget = delta * 1000;
       this.defaultSyncMedia();
       this.setVirtualTimePolicyParams.budget = budget;
       return new Promise<void>(this.virtualTimePromiseExecutor).then(() => {
           this.currentTime = timeInSeconds;
       });
   }

   private runSetTimeWithoutMedia(page: Page, timeInSeconds: number): Promise<void> {
       const delta = timeInSeconds - this.currentTime;
       if (delta <= 0) return Promise.resolve();
       const budget = delta * 1000;
       this.setVirtualTimePolicyParams.budget = budget;
       return new Promise<void>(this.virtualTimePromiseExecutor).then(() => {
           this.currentTime = timeInSeconds;
       });
   }
   ```
3. Inside `prepare()`, based on `this.hasMedia`, dynamically assign:
   `this.runSetTimeFn = this.hasMedia ? this.runSetTimeWithMedia.bind(this) : this.runSetTimeWithoutMedia.bind(this);`
4. Update `setTime()` to call the dynamically assigned method:
   ```typescript
   setTime(page: Page, timeInSeconds: number): Promise<void> | void {
     return this.runSetTimeFn(page, timeInSeconds);
   }
   ```

**Why**: By replacing the boolean branch with a single monomorphic function dispatch set during initialization, we completely avoid evaluating `this.syncMediaState === 1 && this.hasMedia` during every single frame loop iteration.

**Risk**: Negligible. Functional outcome is identical. Function dispatch overhead may be equivalent to a highly predictable boolean branch.

## Variations
- **Variation A**: Remove `syncMediaState` tracking and simply check `if (this.hasMedia)` directly to avoid redundant evaluation.

## Canvas Smoke Test
Run a Canvas render to ensure `CanvasStrategy` is unaffected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts` to verify the rendering still succeeds.
