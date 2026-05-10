---
id: PERF-468
slug: bypass-await-stability-check-truthiness
status: unclaimed
claimed_by: ""
created: 2024-05-14
completed: ""
result: ""
---

# PERF-468: Bypass await for undefined stabilityCheckFn via truthiness

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `runSetTime()` hot loop.

## Background Research
In `CdpTimeDriver.ts`, the `runSetTime` loop awaits the stability check:
`await this.stabilityCheckFn();`

If `window.helios.waitUntilStable` is undefined, `stabilityCheckFn` is assigned to a no-op `() => {}` which returns `undefined`. Using `await undefined` internally causes V8 to wrap it in a `Promise.resolve(undefined)`, suspend the function, and schedule resumption on the microtask queue. This incurs measurable overhead on every frame. In PERF-466, an `instanceof Promise` check was used, but the prototype traversal offset the gains. A simple JavaScript truthiness check (`if (res) await res`) avoids this overhead entirely by hitting V8's fast-path `ToBoolean`.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600 resolution, 30 FPS, 5 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.569s
- **Bottleneck analysis**: Microtask queue scheduling overhead from `await undefined` in the hot loop.

## Implementation Spec

### Step 1: Bypass await on falsy result
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime()`, replace the unconditional await:
```typescript
<<<<<<< SEARCH
    // Wait for custom stability checks
    await this.stabilityCheckFn();
=======
    // Wait for custom stability checks
    const stabilityResult = this.stabilityCheckFn();
    if (stabilityResult) {
      await stabilityResult;
    }
>>>>>>> REPLACE
```
**Why**: Avoids `Promise.resolve` and microtask queue suspension when `stabilityCheckFn` returns `undefined`.
**Risk**: None. V8 truthiness checks are heavily optimized.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Verify frames capture properly without hanging.
