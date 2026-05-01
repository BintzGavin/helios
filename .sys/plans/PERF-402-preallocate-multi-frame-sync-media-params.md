---
id: PERF-402
slug: preallocate-multi-frame-sync-media-params
status: complete
claimed_by: ""
created: 2024-06-03
completed: ""
result: "failed"
---

# PERF-402: Preallocate multi-frame sync media params array in CdpTimeDriver

## Focus Area
The multi-frame hot path in `CdpTimeDriver.ts` `runSetTime()` dynamic allocation of parameter objects for `Runtime.evaluate` media sync.

## Background Research
In `CdpTimeDriver.ts`, the multi-frame code path inside `runSetTime` iterates over all execution contexts to synchronize media elements. For each execution context, it dynamically allocates a new object literal:
```typescript
this.client!.send('Runtime.evaluate', {
  expression: expression,
  contextId: this.executionContextIds[i],
  awaitPromise: false
}).catch(this.handleSyncMediaError);
```
Creating these short-lived objects on every frame generates V8 garbage collection pressure. As learned in `PERF-388`, reusing a single parameter object across multiple asynchronous CDP calls (like a loop over multiple execution contexts) can cause race conditions because Playwright serializes commands asynchronously, and mutating the single shared object may result in overwriting properties before the previous frame is fully serialized.
However, we can safely preallocate an **array of distinct parameter objects**, one for each execution context! Since `executionContextIds` array only grows, we can maintain an array of `multiFrameSyncMediaParams`, assigning each one its permanent `contextId`. In the hot loop, we only update the `expression` property on the preallocated object corresponding to that frame, avoiding object allocation while completely mitigating the asynchronous mutation race condition.

## Benchmark Configuration
- **Composition URL**: Any multi-frame DOM composition (e.g. `tests/verify-iframe-sync.ts`)
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-allocations of `{ expression, contextId, awaitPromise }` objects inside the multi-frame `for` loop in `CdpTimeDriver.ts` cause V8 GC pressure.

## Implementation Spec

### Step 1: Preallocate `multiFrameSyncMediaParams`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a class property `private multiFrameSyncMediaParams: any[] = [];`.

### Step 2: Initialize Params Array
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime()`, just before the `for` loop that iterates over `this.executionContextIds`:
Check if `this.multiFrameSyncMediaParams` needs to be initialized or resized:
```typescript
if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
  this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
  for (let i = 0; i < this.executionContextIds.length; i++) {
    this.multiFrameSyncMediaParams[i] = {
      expression: "",
      contextId: this.executionContextIds[i],
      awaitPromise: false
    };
  }
}
```

### Step 3: Mutate instead of allocate in the hot loop
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime()`, replace the inner loop:
```typescript
<<<<<<< SEARCH
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.client!.send('Runtime.evaluate', {
              expression: expression,
              contextId: this.executionContextIds[i],
              awaitPromise: false
            }).catch(this.handleSyncMediaError);
          }
=======
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.multiFrameSyncMediaParams[i].expression = expression;
            this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]).catch(this.handleSyncMediaError);
          }
>>>>>>> REPLACE
```
**Why**: Completely eliminates the dynamic allocation of the parameter object literal inside the hot loop. By having a separate parameter object per `contextId`, we avoid async mutation race conditions without paying the penalty of inline object allocation.
**Risk**: None. The logic matches the multi-frame Promise array preallocation used in `SeekTimeDriver.ts` from `PERF-392`.

## Variations
None.

## Correctness Check
Run targeted script `cd packages/renderer && npx tsx tests/verify-cdp-driver.ts`.

## Results Summary
- IMPOSSIBLE: DUPLICATION
- The preallocation of `multiFrameSyncMediaParams` is already present in `packages/renderer/src/drivers/CdpTimeDriver.ts`.
