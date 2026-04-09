---
id: PERF-224
slug: mutate-seek-call-params
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-224: Mutate callParams.arguments instead of reallocating in SeekTimeDriver

## Focus Area
DOM Rendering Pipeline - CDP Context in `SeekTimeDriver.ts`.

## Background Research
In `packages/renderer/src/drivers/SeekTimeDriver.ts`, the `setTime` method is called per frame for every worker. When the optimized path is hit (1 frame and `objectId` present), it invokes `Runtime.callFunctionOn`. Currently, the `this.callParams.arguments` is overridden with a new array literal containing two new objects on every frame:

```typescript
this.callParams.arguments = [{ value: timeInSeconds }, { value: this.timeout }];
```

This dynamic allocation inside the hot loop produces unnecessary garbage, which can lead to micro-stalls from garbage collection. In `PERF-193` and `PERF-175`, mutating a pre-allocated parameter object rather than dynamically allocating a new one was shown to reduce GC overhead and improve performance. We can apply the same optimization here by mutating the properties of the existing objects instead of creating new arrays and objects.

Memory specifies that `PERF-180` (Inline parameters in SeekTimeDriver) was discarded because it increased allocations by inlining the entire `cdpSession.send` parameters object literal. This plan avoids that by mutating the already-cached `this.callParams` object.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s
- **Bottleneck analysis**: Micro-stalls from garbage collection due to dynamic object/array allocations inside the `setTime` hot loop.

## Implementation Spec

### Step 1: Mutate `callParams.arguments` array instead of allocating
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `setTime` method, locate:
```typescript
      this.callParams.arguments = [{ value: timeInSeconds }, { value: this.timeout }];
```
Replace it with:
```typescript
      this.callParams.arguments[0].value = timeInSeconds;
      this.callParams.arguments[1].value = this.timeout;
```
**Why**: Avoids creating a new array and two objects per frame, reducing V8 GC pressure in the hot loop.
**Risk**: Negligible. The array and its objects are pre-allocated in the class constructor and safe to mutate since `setTime` is called sequentially for each frame on the given worker.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode remains functional.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to ensure CDP communication remains intact.

## Prior Art
PERF-193, PERF-175 optimize object literal allocations in the CDP hot loops.
