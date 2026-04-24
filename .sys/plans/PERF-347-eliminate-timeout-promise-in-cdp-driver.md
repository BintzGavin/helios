---
id: PERF-347
slug: eliminate-timeout-promise-in-cdp-driver
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-347: Eliminate custom timeout Promise in CdpTimeDriver.ts

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` hot loop and stability check mechanism.

## Background Research
Currently, inside the `setTime` method of `CdpTimeDriver.ts`, there is a complex pre-bound closure logic involving `stabilityPromiseExecutor` and custom state (`this.stabilityTimeoutId`, `this.stabilityResolve`, `this.stabilityReject`) specifically built to act as a timeout for the stability check (`window.__helios_wait_until_stable()`). This relies on a Node.js `setTimeout` racing against the CDP response.

In `PERF-343`, the inline `Promise.race` was removed and executors were prebound, which gave a ~12% render time improvement by avoiding inline closures and arrays. However, even the prebound `stabilityPromiseExecutor` logic is still heavy: on *every single frame*, Node.js allocates a timer on the V8 event loop heap and manages state properties across the class.

However, since `PERF-323`, the `TimeDriver` interface was updated to return `Promise<void> | void`, and `CaptureLoop` properly handles it. We can further streamline `CdpTimeDriver.ts` by replacing the custom Node.js `setTimeout` timer logic with native `awaitPromise: true` behavior in the CDP `Runtime.evaluate` payload.

By doing this, we drop the node-side timer entirely and rely on Playwright's overarching session timeout, further reducing GC churn inside the hot loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.149s (from PERF-346)
- **Bottleneck analysis**: The micro-allocation of V8 timers (`setTimeout`) and state transitions (`this.stabilityTimeoutId`) across frames for a mostly non-blocking stability check adds node-side CPU overhead in a hot loop.

## Implementation Spec

### Step 1: Replace custom timeout Promise in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove the custom `stabilityPromiseExecutor` and state variables entirely, and instead rely on `awaitPromise: true` during the CDP evaluate for the stability check.

1. Remove `stabilityTimeoutId`, `stabilityResolve`, `stabilityReject` from the class properties.
2. Remove `handleStabilitySuccess`, `handleStabilityError`, and `stabilityPromiseExecutor` methods.
3. Replace the `try/catch` block for `stabilityPromiseExecutor` in `setTime` with a straightforward `evaluate` call with `awaitPromise: true`.

Currently it looks like:
```typescript
    try {
      await new Promise<void>(this.stabilityPromiseExecutor);
    } catch (e: any) {
      if (e.message === 'Stability check timed out') { ... }
    }
```
Modify `evaluateStabilityParams` during initialization to include `awaitPromise: true` and execute it directly.

**Why**: Avoids creating a new timer on the Node.js event loop for every single frame and simplifies state.
**Risk**: If a frame hangs indefinitely during `waitUntilStable`, the renderer might hang. However, Playwright's timeout mechanisms provide bounds.

## Variations

### Variation A: Retain termination logic with a wrapper
If we must keep the exact `"Stability check timed out"` early-termination behavior, we can still use a simplified `Promise.race` directly inside `setTime` but only allocate the `setTimeout` when strictly necessary or preallocate a reusable timer pool. The primary goal is to avoid the V8 garbage collection churn on every frame.

## Canvas Smoke Test
Ensure the generic `canvas` mode works, though this file specifically governs the `dom` mode time driver.

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` contains 600 correct frames.

## Prior Art
- `PERF-343` proved that removing `Promise.race` arrays improved performance in this specific method.
- `PERF-323` updated TimeDriver to return void where possible, simplifying unobserved promise allocations.
