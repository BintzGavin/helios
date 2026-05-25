---
id: PERF-587
slug: inline-cdp-evaluate-promises
status: unclaimed
claimed_by: ""
created: 2026-10-31
completed: ""
result: ""
---

# PERF-587: Inline CDP Evaluate Promises in CdpTimeDriver

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
In `CdpTimeDriver.ts`, the `defaultSyncMedia` function executes CDP `Runtime.evaluate` on every frame iteration (when media exists). Currently, it invokes `this.client!.send(...)` without explicitly catching errors, or uses closures depending on the state. Recent experiments (like PERF-584 and PERF-580) demonstrated that chaining or directly returning Promises, while avoiding closures and explicit `try/catch` contexts, can incrementally reduce V8 garbage collection and microtask overhead in hot loops. By capturing the `Runtime.evaluate` Promise and chaining a pre-bound `.catch()` or `.then()`, we might eliminate silent unhandled Promise rejections and optimize the generator context.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.446s
- **Bottleneck analysis**: Unhandled Promise allocations and hidden V8 closure microtask generation inside `defaultSyncMedia`.

## Implementation Spec

### Step 1: Optimize Runtime.evaluate chains
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Inside the `defaultSyncMedia` method, update all instances of `this.client!.send('Runtime.evaluate', ...)` to chain a bound `.catch(noopCatch)`. There are three instances in this method. For example:
```typescript
this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
```
**Why**: Ensure the V8 runtime doesn't penalize the hot loop for unhandled Promise allocations, while avoiding inline closures by utilizing the pre-existing `noopCatch` function defined at the top of the file.

## Correctness Check
Execute the renderer benchmark to verify no frames are dropped, the video outputs correctly, and media syncing functions.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break Canvas compilation.
