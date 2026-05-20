---
id: PERF-550
slug: inline-cdp-evaluate-params
status: unclaimed
claimed_by: ""
created: 2024-05-20
completed: ""
result: ""
---
# PERF-550: Inline CDP evaluate parameters to bypass object mutation overhead

## Focus Area
`CdpTimeDriver.ts` hot loop (`defaultSyncMedia`) `this.singleFrameSyncMediaParams` allocation.

## Background Research
In `CdpTimeDriver.ts`, the CDP `Runtime.evaluate` command is called heavily in `defaultSyncMedia` to sync media state on every frame. Currently, to avoid object allocation, it pre-allocates an object (`this.singleFrameSyncMediaParams`) and mutates the `expression` property on every frame:
`this.singleFrameSyncMediaParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";`
However, V8 is highly optimized for short-lived object literals. Mutating an existing object property repeatedly might bypass some inline cache optimizations or cause hidden class deoptimizations under heavy CDP load. By creating a new inline object literal `{ expression: "...", awaitPromise: false, returnByValue: false }` directly inside the `this.client!.send` call, we might enable V8 to better optimize the `send` argument parsing and garbage collect it instantly in the young generation, potentially speeding up the hot loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60fps, duration 10s (600 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s

## Implementation Spec

### Step 1: Inline `singleFrameSyncMediaParams`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `defaultSyncMedia` function, instead of using `this.singleFrameSyncMediaParams`, change the `Runtime.evaluate` calls to use an inline object literal:
```typescript
this.client!.send('Runtime.evaluate', {
  expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");",
  awaitPromise: false,
  returnByValue: false
});
```
Remove the `private singleFrameSyncMediaParams: any = ...` declaration from the class, as it is no longer needed.
For `multiFrameSyncMediaParams`, keeping it might still be beneficial since it's an array, but if the single frame code path dominates, optimizing it first is key. We can try inlining the multi-frame object inside the loop as well:
```typescript
this.client!.send('Runtime.evaluate', {
  expression: expression,
  contextId: this.executionContextIds[i],
  awaitPromise: false,
  returnByValue: false
});
```
Remove `this.multiFrameSyncMediaParams` entirely.

**Why**: Eliminates object property mutation which may cause hidden class deoptimizations in V8. Fresh object literals are rapidly garbage collected in the nursery.
**Risk**: If allocation overhead is actually worse than mutation, performance may regress slightly, though modern V8 typically handles this extremely well.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run`

## Correctness Check
Run `npm run test -w packages/renderer -- --run` to ensure the DOM output is still correct and the test suite passes.

## Prior Art
PERF-532 attempted to inline `defaultSyncMedia` directly but regressed due to complex V8 deoptimization. This experiment tests an isolated, simpler inlining of object literals without refactoring the function structure.
