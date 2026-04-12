---
id: PERF-260
slug: prebind-virtual-time-promise
status: unclaimed
claimed_by: ""
created: 2024-04-12
completed: ""
result: ""
---
# PERF-260: Prebind Virtual Time Promise in CdpTimeDriver.ts

## Focus Area
The `setTime` hot loop in `CdpTimeDriver.ts`. Specifically, eliminating the dynamic anonymous `Promise` allocation and closure around `Emulation.setVirtualTimePolicy` by statically caching a pre-bound execution context.

## Background Research
During each frame in the `setTime` hot loop of `CdpTimeDriver.ts` (when using DOM mode with CDP driver), advancing the virtual time requires awaiting the `Emulation.virtualTimeBudgetExpired` CDP event. Currently, this is achieved by dynamically instantiating an anonymous Promise on every single frame:

```typescript
await new Promise<void>((resolve, reject) => {
  this.cdpResolve = resolve;
  this.cdpReject = reject;
  this.client!.once('Emulation.virtualTimeBudgetExpired', this.handleVirtualTimeBudgetExpired);
  // ...
});
```

Allocating a new anonymous closure `(resolve, reject) => { ... }` and a `new Promise` on every frame for 3 workers operating at 60 FPS creates continuous V8 garbage collection overhead and prevents full loop unrolling optimizations. Previous memory observations (e.g. PERF-245, PERF-259) confirmed that pre-binding promise executors out of the hot loop provides measurable GC reduction. We can pre-allocate a generic wrapper around this logic.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s (150 frames), ultrafast preset, mjpeg intermediate.
- **Mode**: `dom` (via simple-canvas-animation example testing DOM framework integration)
- **Metric**: Wall-clock render time in seconds (via `benchmark-test.js`)
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.920s (from previous results)
- **Bottleneck analysis**: The `setTime` method is evaluated per-worker per-frame, and allocating the `new Promise` wrapper causes micro-stalls during Playwright IPC synchronization.

## Implementation Spec

### Step 1: Pre-bind the virtual time promise executor in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a class property `private virtualTimePromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => { ... }` that contains the body of the `new Promise` allocation currently in `setTime()`.
2. Move the logic that sets `this.cdpResolve`, `this.cdpReject`, listens to `Emulation.virtualTimeBudgetExpired`, and sends `Emulation.setVirtualTimePolicy` into this pre-bound executor property.
3. In `setTime()`, replace `new Promise<void>((resolve, reject) => { ... })` with `new Promise<void>(this.virtualTimePromiseExecutor)`.

**Why**: Eliminates dynamic closure allocation during the hot-loop, reducing V8 GC overhead.
**Risk**: If `this` context binding is lost or if the executor needs state bound tightly to `setTime` other than class properties, it could fail. However, `this.setVirtualTimePolicyParams.budget` is already mutated directly on the class instance *before* the promise is created, so the executor only needs to read class state.

## Correctness Check
Run the canvas smoke test and benchmark to verify no execution hangs occur due to missing promise resolutions.

## Canvas Smoke Test
Run `cd packages/renderer && npx tsx scripts/benchmark-test.js` to confirm output video is still correctly generated without regressions or hanging pipelines.
