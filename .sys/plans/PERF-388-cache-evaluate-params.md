---
id: PERF-388
slug: cache-evaluate-params
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-388: Cache inline evaluation parameter allocation in CdpTimeDriver.ts

## Focus Area
`CdpTimeDriver.ts`'s `runSetTime` hot loop dynamically allocates an object literal `{ expression: "...", awaitPromise: false }` for `Runtime.evaluate` on every single frame. We should test if caching this object and mutating its `expression` property inline reduces garbage collection overhead in the `frames.length === 1` code path.

## Background Research
In V8, creating object literals inside a hot loop forces the garbage collector to clean up short-lived objects. By pre-allocating an object literal on the class and merely updating its property during the loop, we can eliminate object allocations. Memory PERF-327 notes that sharing an evaluateParams object in a `for` loop across multiple frames is dangerous due to async mutation race conditions before Playwright sends the CDP command. However, for the single-frame optimized path (`frames.length === 1`), `this.client!.send` is called exactly once per frame, and `runSetTime` subsequently `await`s the stability checks and virtual time progression, which ensures the next frame's `runSetTime` won't be called until the current frame is completely processed. This means it is safe to mutate a shared object for the single-frame path.

## Benchmark Configuration
- **Mode**: `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Object allocation overhead on every frame.

## Implementation Spec

### Step 1: Preallocate `syncMediaParams`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a class property: `private singleFrameSyncMediaParams: any = { expression: "", awaitPromise: false };`

### Step 2: Mutate instead of allocate in `runSetTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime`, replace:
`    if (frames.length === 1) {`
`      this.client!.send('Runtime.evaluate', {`
`        expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");",`
`        awaitPromise: false`
`      }).catch(this.handleSyncMediaError);`
`    }`
with:
`    if (frames.length === 1) {`
`      this.singleFrameSyncMediaParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";`
`      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(this.handleSyncMediaError);`
`    }`
**Why**: Avoids dynamic object allocation on every frame, reducing V8 GC churn.
**Risk**: Safe because `runSetTime` is sequentially awaited.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Run targeted script `cd packages/renderer && npx tsx tests/run-all.ts`.
