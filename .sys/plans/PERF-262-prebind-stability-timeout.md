---
id: PERF-262
slug: prebind-stability-timeout
status: unclaimed
claimed_by: ""
created: 2024-04-12
completed: ""
result: ""
---

# PERF-262: Pre-bind stability timeout promise executor in CdpTimeDriver.ts

## Focus Area
DOM Rendering Pipeline - The `setTime` hot loop in `CdpTimeDriver.ts`. Specifically, eliminating the dynamic anonymous closures allocated per-frame for the timeout mechanism.

## Background Research
In the `CdpTimeDriver.setTime()` method, we wait for stability checks while providing a safety timeout. The implementation currently dynamically allocates a `new Promise` and two anonymous closures on every single frame:

```typescript
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Stability check timed out'));
      }, this.timeout);
    });
```

Because `setTime()` is called once per frame (e.g., 1800 times for a 60-second video at 30fps) by each concurrent worker, V8 must allocate the Promise object, the `(_, reject) => { ... }` executor closure, and the `() => { reject(new Error(...)) }` timer callback continuously. This creates unnecessary garbage collection pressure.

While memory states that eliminating the `timeoutPromise` wrapper and `Promise.race()` allocation degraded performance compared to the baseline (PERF-257), we can still optimize the execution by pre-binding the executor and timer callbacks into class properties, similar to how we successfully eliminated closure allocations in the `virtualTimePromiseExecutor` (PERF-260).

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds (via `benchmark-test.js`)
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~13.187s
- **Bottleneck analysis**: The continuous allocation of `new Promise` and nested anonymous arrow functions creates micro-stalls during Playwright IPC synchronization.

## Implementation Spec

### Step 1: Pre-bind the timeout executor
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add class properties to track the reject function and the timeout ID:
   `private timeoutReject: ((err: Error) => void) | null = null;`
   `private stabilityTimeoutId: NodeJS.Timeout | null = null;`
2. Add a pre-bound timer callback class property:
   ```typescript
   private handleStabilityTimeout = () => {
     if (this.timeoutReject) {
       this.timeoutReject(new Error('Stability check timed out'));
       this.timeoutReject = null;
     }
   };
   ```
3. Add a pre-bound executor class property:
   ```typescript
   private timeoutPromiseExecutor = (_: () => void, reject: (err: Error) => void) => {
     this.timeoutReject = reject;
     this.stabilityTimeoutId = setTimeout(this.handleStabilityTimeout, this.timeout);
   };
   ```
4. Update `setTime()` to use the pre-bound executor and clear the correct timer ID:
   ```typescript
   // ...
   const timeoutPromise = new Promise<void>(this.timeoutPromiseExecutor);
   try {
     // ... Promise.race ...
   } finally {
     if (this.stabilityTimeoutId) {
       clearTimeout(this.stabilityTimeoutId);
       this.stabilityTimeoutId = null;
     }
   }
   ```

**Why**: By replacing the anonymous arrow functions with pre-bound instance properties, we eliminate dynamic closures. V8 only instantiates the methods once when the `CdpTimeDriver` is created.
**Risk**: Overlapping state if multiple `setTime` calls happen concurrently on the same class instance. However, workers execute `setTime` sequentially per-page, so `timeoutReject` and `stabilityTimeoutId` state is safe from race conditions.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npx tsx scripts/benchmark-test.js` to ensure the benchmark completes without errors, and test stability timeout manually if possible.

## Correctness Check
Run the DOM rendering tests to verify frames are generated correctly and the pipeline completes.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
4	32.167	90	2.80	36.6	discard	prebind-stability-timeout
5	32.127	90	2.80	36.6	discard	prebind-stability-timeout
6	32.152	90	2.80	36.8	discard	prebind-stability-timeout
```
