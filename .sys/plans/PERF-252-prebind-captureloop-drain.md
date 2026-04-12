---
id: PERF-252
slug: prebind-captureloop-drain
status: complete
claimed_by: "executor-session"
created: "2026-04-12"
completed: ""
result: ""
---

# PERF-252: Prebind CdpTimeDriver Stability Check Closure

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
During the `setTime` execution loop, `CdpTimeDriver` schedules a `timeoutPromise` wrapper utilizing anonymous closures, and performs `this.client!.send('Runtime.callFunctionOn', ...).then(res => { ... })` where the `.then` callback is dynamically allocated on every frame.
Given that we've found V8 garbage collection to be a bottleneck in tight rendering loops, we should eliminate closure allocations where possible.
By pre-defining the `.then` callback as an arrow function property on the `CdpTimeDriver` class, we eliminate the per-frame allocation of `res => { ... }`.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `canvas` (since CdpTimeDriver is used there predominantly)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~584ms for pure CDP loop.
- **Bottleneck analysis**: V8 garbage collection inside the time synchronization hot loop.

## Implementation Spec

### Step 1: Extract `.then` callback
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a class property:
```typescript
  private handleStabilityCheckResponse = (res: any) => {
    if (res && res.exceptionDetails) {
      throw new Error('Stability check failed: ' + res.exceptionDetails.exception?.description);
    }
  };
```
And inside `setTime`:
```typescript
<<<<<<< SEARCH
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(res => {
              if (res.exceptionDetails) {
                throw new Error('Stability check failed: ' + res.exceptionDetails.exception?.description);
              }
            })
          : page.evaluate(() => {
=======
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)
          : page.evaluate(() => {
>>>>>>> REPLACE
```

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`.

## Correctness Check
Run the CDP test suite.
