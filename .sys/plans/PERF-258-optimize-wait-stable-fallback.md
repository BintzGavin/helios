---
id: PERF-258
slug: optimize-wait-stable-fallback
status: unclaimed
claimed_by: ""
created: 2024-06-06
completed: ""
result: ""
---

# PERF-258: Optimize wait stable fallback closure in CdpTimeDriver.ts

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` in the `setTime` method's `Promise.race` logic for custom stability checks.

## Background Research
The `setTime` hot loop executes multiple times per second for every worker. Within this loop, the following code is executed for custom stability checks:

```typescript
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

Here, `page.evaluate(() => { ... })` allocates an anonymous closure on every single frame when the `waitStableParams.objectId` fallback is hit. Previous optimizations (PERF-256) tried pre-binding this function but failed due to Playwright's serialization overhead when passing a bound property function across the CDP boundary inside `evaluate()`.

However, Playwright allows `page.evaluate` to accept a **string** instead of a closure. Using a string completely eliminates the closure allocation and Playwright function serialization overhead, as the string is directly evaluated as an expression.

Moreover, if we trace earlier logic:
```typescript
    const windowRes = await this.client!.send('Runtime.evaluate', { expression: 'window' });
    if (windowRes.result && windowRes.result.objectId) {
      this.syncMediaParams.objectId = windowRes.result.objectId;
      this.waitStableParams.objectId = windowRes.result.objectId;
    }
```
`this.waitStableParams.objectId` is highly likely to be populated, so this fallback might not be the *primary* path, but it exists and still allocates closure references or Playwright parses it. If it *is* used, replacing the anonymous closure with a static string like `"if(typeof window.__helios_wait_until_stable==='function')window.__helios_wait_until_stable();"` removes the overhead completely.

Furthermore, we should also notice `this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)`. If `handleStabilityCheckResponse` doesn't change anything, it could just be avoided, but it checks for `res.exceptionDetails`.

Wait, actually, what if we use the string string? Playwright `page.evaluate("if(typeof window.__helios_wait_until_stable==='function')window.__helios_wait_until_stable();")` is completely valid.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 600x600 resolution, 30 FPS, 150 frames, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 12.10s (on the current machine)
- **Bottleneck analysis**: Micro-allocations inside the hot loop cause GC pauses. V8 allocates anonymous closures on every frame.

## Implementation Spec

### Step 1: Replace anonymous closure with string evaluation in fallback
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Change the `page.evaluate` argument in the fallback to a static string.

```typescript
    try {
      await Promise.race([
        (this.waitStableParams.objectId
          ? this.client!.send('Runtime.callFunctionOn', this.waitStableParams).then(this.handleStabilityCheckResponse)
          : page.evaluate("if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();")),
        timeoutPromise
      ]);
```

**Why**: Avoids creating a new closure object in memory and prevents Playwright from serializing a function object on every frame fallback.
**Risk**: Negligible. String evaluations in Playwright work seamlessly.

## Correctness Check
Run `tests/verify-cdp-driver.ts` to ensure the driver still passes basic execution flow and stability checks. Run `benchmark-test.js` to get the performance numbers.

## Prior Art
PERF-256 (pre-binding failed due to Playwright serialization). PERF-018 showed string templates or explicit args impact `evaluate`. For simple scripts, pure strings without variables are the fastest way to use `evaluate`.
