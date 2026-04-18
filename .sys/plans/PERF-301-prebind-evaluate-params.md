---
id: PERF-301
slug: prebind-evaluate-params
status: complete
claimed_by: ""
created: 2024-04-18
completed: ""
result: ""
---

# PERF-301: Cache evaluate parameters for CdpTimeDriver's Stability Checks

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts`

## Background Research
In `CdpTimeDriver.ts`, inside the hot loop `setTime()`, the stability check passes a dynamically allocated parameter object to `Runtime.evaluate`:
```typescript
        this.client!.send('Runtime.evaluate', {
          expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();",
          awaitPromise: true
        }).then(this.handleStabilityCheckResponse)
```
This forces V8 to allocate a new object literal (`{ expression: ..., awaitPromise: true }`) for every frame rendered. Since this code runs for every frame of a composition, pre-binding or caching this parameter object and simply reusing it avoids garbage collection and memory allocation overhead. This aligns with other optimizations like `PERF-296` where inlining object allocation within tight loops was shown to be problematic.

## Benchmark Configuration
- **Composition URL**: `tests/fixtures/benchmark.ts`
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~59.317s
- **Bottleneck analysis**: Microtask yielding and dynamic object allocation overhead inside the single-frame evaluation loop.

## Implementation Spec

### Step 1: Preallocate `Runtime.evaluate` Parameter Object
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a private class property:
```typescript
  private stabilityCheckParams: any = {
    expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();",
    awaitPromise: true
  };
```
2. In `setTime()`, replace the inline object literal:
```typescript
        this.client!.send('Runtime.evaluate', this.stabilityCheckParams).then(this.handleStabilityCheckResponse),
```
**Why**: Avoids dynamic object allocation on every single frame loop iteration, reducing GC pressure and leveraging V8 object pooling/hidden classes better.
**Risk**: Negligible, as the parameters are immutable strings and booleans.

## Variations
None

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas rendering still works correctly.

## Correctness Check
Run the DOM benchmark `npx tsx tests/fixtures/benchmark.ts` to verify performance gains and ensure the output video is generated correctly.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	46.667	600	12.86	42.9	discard	Prebind evaluate params
2	46.618	600	12.87	41.2	discard	Prebind evaluate params
3	46.848	600	12.81	41.6	discard	Prebind evaluate params
```
