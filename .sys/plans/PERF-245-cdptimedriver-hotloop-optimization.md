---
id: PERF-245
slug: cdptimedriver-hotloop-optimization
status: unclaimed
claimed_by: ""
created: 2026-10-19
completed: ""
result: ""
---

# PERF-245: Optimize CdpTimeDriver Hot Loop Allocations

## Focus Area
DOM Rendering Pipeline - Execution overhead in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
In previous tasks (e.g. PERF-224), we aggressively eliminated closure allocations, array instantiation, and dynamic parameter creation from the `setTime` hot loop in `SeekTimeDriver.ts`.
Currently, `CdpTimeDriver.setTime` still allocates a new `Promise<any>[]` array `new Array(frames.length)` per frame when there are multiple frames, and dynamically allocates an arrow function closure `() => resolve()` inside a `.then()` chain to handle the CDP virtual time policy event.
By statically caching an evaluation promises array and a pre-bound event listener handler class property, we can eliminate these per-frame allocations from the hot loop in `CdpTimeDriver`.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `canvas` (since CdpTimeDriver is used there predominantly)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: (Varies by environment, refer to latest baseline)
- **Bottleneck analysis**: V8 garbage collection and array allocation inside the time synchronization hot loop.

## Implementation Spec

### Step 1: Pre-allocate Promises Array
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a private property `private cachedPromises: Promise<any>[] = [];` to `CdpTimeDriver`.
In `setTime`, replace `const framePromises: Promise<any>[] = new Array(frames.length);` with:
```typescript
        if (this.cachedPromises.length !== frames.length) {
          this.cachedPromises = new Array(frames.length);
        }
        const framePromises = this.cachedPromises;
```
**Why**: Avoids dynamically allocating arrays inside the hottest code path.

### Step 2: Extract Promise Closure
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a pre-bound event listener variable to class properties to resolve a pending CDP response instead of declaring a new anonymous closure each time.
```typescript
  private cdpResolve: (() => void) | null = null;
  private cdpReject: ((err: Error) => void) | null = null;

  private handleVirtualTimeBudgetExpired = () => {
     if (this.cdpResolve) {
         this.cdpResolve();
         this.cdpResolve = null;
         this.cdpReject = null;
     }
  };
```
And inside `setTime`:
```typescript
<<<<<<< SEARCH
    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    await new Promise<void>((resolve, reject) => {
      // Use 'once' to avoid leaking listeners
      this.client!.once('Emulation.virtualTimeBudgetExpired', () => resolve());

      this.setVirtualTimePolicyParams.budget = budget;
      this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(reject);
    });
=======
    // 2. Advance virtual time
    // This triggers the browser event loop and requestAnimationFrame
    await new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
      // Use 'once' to avoid leaking listeners
      this.client!.once('Emulation.virtualTimeBudgetExpired', this.handleVirtualTimeBudgetExpired);

      this.setVirtualTimePolicyParams.budget = budget;
      this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch((err) => {
         if (this.cdpReject) {
            this.cdpReject(err);
            this.cdpResolve = null;
            this.cdpReject = null;
         }
      });
    });
>>>>>>> REPLACE
```
**Why**: Removes inline closure overhead during fast execution paths.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode frames synchronize correctly.

## Correctness Check
Run the canvas test suite to ensure virtual time does not hang.
