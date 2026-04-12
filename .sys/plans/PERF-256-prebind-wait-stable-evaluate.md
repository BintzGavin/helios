---
id: PERF-256
slug: prebind-wait-stable-evaluate
status: unclaimed
claimed_by: ""
created: 2026-04-12
completed: ""
result: ""
---

# PERF-256: Prebind wait stable evaluate in CdpTimeDriver

## Focus Area
The `setTime` hot loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`. Specifically, the fallback stability check uses `page.evaluate(() => { ... })` which allocates an anonymous closure on every frame.

## Background Research
In previous optimizations (e.g., PERF-252, PERF-253, PERF-254, PERF-255), we observed that dynamically allocating anonymous functions inside the hot loop causes V8 garbage collection overhead and execution slowdowns. In `CdpTimeDriver.ts`, there is an inline `page.evaluate(() => { ... })` for the stability check fallback when `this.waitStableParams.objectId` is not available. Although this is a fallback path, pre-binding it to a class property avoids closure allocation overhead per frame.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 600x600, 30fps, 5s duration (150 frames), ultrafast libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.95s
- **Bottleneck analysis**: The `setTime()` function executes 150 times per render. Dynamic closures inside this hot loop cause per-frame V8 garbage collection overhead.

## Implementation Spec

### Step 1: Prebind the closure
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**: Move the anonymous closure inside the `Promise.race` fallback to a class property:
```typescript
private waitStableClosure = () => {
  if (typeof (window as any).__helios_wait_until_stable === 'function') {
    return (window as any).__helios_wait_until_stable();
  }
};
```
Then update the fallback call in `setTime`:
```typescript
: page.evaluate(this.waitStableClosure)),
```
**Why**: Avoids creating a new closure object in memory on every invocation, reducing GC pauses and execution overhead.
**Risk**: None. It's a standard optimization we've successfully applied to similar Playwright `evaluate` calls.

## Correctness Check
Run `tests/verify-cdp-driver.ts` to ensure the driver still passes basic execution flow and stability checks.
