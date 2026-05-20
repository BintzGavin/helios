---
id: PERF-552
slug: inline-multi-frame-sync-media-params
status: unclaimed
claimed_by: ""
created: 2026-05-20
completed: ""
result: ""
---

# PERF-552: Inline `multiFrameSyncMediaParams` allocation

## Focus Area
`CdpTimeDriver.ts` hot loop (`defaultSyncMedia`) `this.multiFrameSyncMediaParams` array allocation and mutation.

## Background Research
In `CdpTimeDriver.ts`, the CDP `Runtime.evaluate` command is called heavily in `defaultSyncMedia` to sync media state on every frame. Currently, when there are multiple frames, it manages an array of objects (`this.multiFrameSyncMediaParams`), dynamically resizing it and mutating the `expression` property on every frame. As seen in `PERF-550`, changing a single pre-allocated object to an inline object literal caused a regression, likely because V8 optimized the single, stable object's hidden classes well, and rapidly allocating single objects added GC pressure. However, managing a dynamic array of objects and mutating them within a loop is a different access pattern. It's possible that for the multi-frame case, bypassing the array management and object mutation entirely by directly allocating inline literals in the `send` call might be faster or reduce overhead, especially if the array size varies or V8 struggles to optimize the array of mutated objects as well as a single scalar object.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, duration 10s (600 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: Overhead of managing and mutating the `multiFrameSyncMediaParams` array in the hot loop.

## Implementation Spec

### Step 1: Inline `multiFrameSyncMediaParams`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `defaultSyncMedia` function, inside the `if (this.executionContextIds.length > 0)` block, replace the array management and mutation logic:

```typescript
          if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
            this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameSyncMediaParams[i] = {
                expression: "",
                contextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
              };
            }
          }
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.multiFrameSyncMediaParams[i].expression = expression;
            this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]);
          }
```

with an inline object literal allocation:

```typescript
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.client!.send('Runtime.evaluate', {
                expression: expression,
                contextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
            });
          }
```
Remove the `private multiFrameSyncMediaParams: any[] = [];` declaration from the class.

**Why**: Simplifies the hot loop by removing array resizing and object mutation, potentially allowing V8 to optimize the inline literal allocation better than an array of mutated objects.
**Risk**: Similar to PERF-550, this could increase GC pressure and regress performance if V8 is better at handling the mutated array elements than rapid inline allocations.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run`

## Correctness Check
Run `npm run test -w packages/renderer -- --run` to ensure DOM output is still correct and worker logic functions normally.

## Prior Art
PERF-550 attempted to inline `singleFrameSyncMediaParams` and was discarded because it caused a regression. This experiment tests if the multi-frame array mutation logic suffers from different overhead characteristics where inlining might be beneficial.