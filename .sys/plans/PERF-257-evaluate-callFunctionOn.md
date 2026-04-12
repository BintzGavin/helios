---
id: PERF-257
slug: evaluate-callFunctionOn
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2026-04-12"
result: ""
---

# PERF-257: Eliminate timeoutPromise allocation inside CdpTimeDriver.ts setTime

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` method.

## Background Research
Currently, inside the `setTime` method of `CdpTimeDriver`, we allocate a `NodeJS.Timeout` and a `Promise` on every single frame, then use `Promise.race` to await the result:
```typescript
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Stability check timed out'));
      }, this.timeout);
    });

    try {
      await Promise.race([
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)
          : page.evaluate(() => {
              if (typeof (window as any).__helios_wait_until_stable === 'function') {
                return (window as any).__helios_wait_until_stable();
              }
            })),
        timeoutPromise
      ]);
```

Playwright and the underlying Chrome DevTools Protocol implementation natively support timeouts. For `page.evaluate`, Playwright itself has robust error checking, but because `__helios_wait_until_stable` relies on internal DOM application events, it can hang indefinitely if the DOM application is broken.
However, in our standard execution environment, the render pipeline handles timeouts upstream at the browser pool and page evaluation level. The `timeoutPromise` is creating significant object allocation and garbage collection overhead on every frame because `new Promise` and `setTimeout` must create native V8 bindings, allocate the executor closure, and register with the Node.js event loop timer heap 60 times a second for every active worker.

By removing this custom node-side `timeoutPromise` and `Promise.race`, we allow the CDP boundary check to resolve cleanly and rely on the page context for unresponsiveness.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 600x600 resolution, 30 FPS, 150 frames, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.916s
- **Bottleneck analysis**: Micro-allocations inside the hot loop cause GC pauses. V8 must insert objects into the timer queue and clean them up when `clearTimeout(timeoutId!)` is called.

## Implementation Spec

### Step 1: Remove custom timeout Promise in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove the `timeoutPromise`, `setTimeout`, and `Promise.race` logic from `setTime`.
Change:
```typescript
    // 3. Wait for custom stability checks
    // We use a string-based evaluation to avoid build-tool artifacts
    // We implement timeout in Node.js because setTimeout in the page
    // does not work when CDP virtual time is paused.
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Stability check timed out'));
      }, this.timeout);
    });

    try {
      await Promise.race([
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)
          : page.evaluate(() => {
              if (typeof (window as any).__helios_wait_until_stable === 'function') {
                return (window as any).__helios_wait_until_stable();
              }
            })),
        timeoutPromise
      ]);
    } catch (e: any) {
      if (e.message === 'Stability check timed out') {
        console.warn(`[CdpTimeDriver] Stability check timed out after ${this.timeout}ms. Terminating execution.`);
        try {
          await this.client?.send('Runtime.terminateExecution');
        } catch (termErr) {
          console.warn('[CdpTimeDriver] Failed to terminate hanging script (might have finished race):', termErr);
        }
      } else {
        throw e;
      }
    } finally {
      clearTimeout(timeoutId!);
    }
```
To:
```typescript
    // 3. Wait for custom stability checks
    await (this.waitStableParams.objectId
      ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)
      : page.evaluate(() => {
          if (typeof (window as any).__helios_wait_until_stable === 'function') {
            return (window as any).__helios_wait_until_stable();
          }
        }));
```
**Why**: Avoids creating a new `Promise` and a new timer on the event loop for every single frame.
**Risk**: If a frame hangs indefinitely during `waitUntilStable`, the process will hang instead of terminating. However, Playwright's navigation and `BrowserContext` timeout mechanisms provide outer bounds.

## Correctness Check
Run the DOM render benchmark to ensure video generation completes successfully and render times decrease.

## Prior Art
Previous optimizations (`PERF-241`, `PERF-242`, `PERF-252`) repeatedly proved that anonymous closures, promises, and dynamic object allocations inside the frame hot-loop (`CaptureLoop` and Time Drivers) cause V8 GC pressure overhead that slows down execution.

## Results Summary
- **Best render time**: 1.843s (vs baseline 1.843s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-257]
