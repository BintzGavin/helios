---
id: PERF-392
slug: preallocate-seek-promises-array
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-392: Preallocate multiFramePromises array in SeekTimeDriver

## Focus Area
`SeekTimeDriver.ts`'s `setTime` hot loop dynamically allocates an empty array `const promises = [];` for tracking multiple concurrent async `Runtime.evaluate` executions across `executionContextIds` in the multi-frame (iframe) code path. We should test if preallocating the array reduces garbage collection churn and improves render times for multi-frame compositions.

## Background Research
In V8, creating arrays inside a hot loop (like `CaptureLoop.ts`) causes the garbage collector to frequently clean up short-lived array objects. `SeekTimeDriver.setTime()` handles time advancement using `window.__helios_seek` and currently allocates a new `promises` array every single frame in the multi-frame code path (`frames.length > 1`). By preallocating the `promises` array as a class property (`multiFramePromises`) and simply assigning to it by index (and explicitly setting its length), we can eliminate this dynamic array reallocation without causing any async CDP serialization issues.

This mirrors an approach considered in PERF-390, which correctly identified that while we cannot share mutable CDP parameter *objects* across concurrent requests without async race conditions, we can absolutely preallocate the *array* that holds the native Promises returned by `this.cdpSession!.send()`.

## Benchmark Configuration
- **Composition URL**: Any standard DOM test
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-allocations inside the CaptureLoop's `setTime` multi-frame path cause V8 GC pressure.

## Implementation Spec

### Step 1: Preallocate `multiFramePromises`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Add a class property: `private multiFramePromises: Promise<any>[] = [];`

### Step 2: Avoid Array Allocation in `setTime`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime`, replace the multi-frame block:
```typescript
    const promises = [];
    for (let i = 0; i < this.executionContextIds.length; i++) {
      promises.push(this.cdpSession!.send('Runtime.evaluate', {
        expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      }));
    }
    return Promise.all(promises) as unknown as Promise<void>;
```
with:
```typescript
    this.multiFramePromises.length = this.executionContextIds.length;
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.multiFramePromises[i] = this.cdpSession!.send('Runtime.evaluate', {
        expression,
        contextId: this.executionContextIds[i],
        awaitPromise: true
      });
    }
    return Promise.all(this.multiFramePromises) as unknown as Promise<void>;
```
**Why**: Avoids dynamically allocating a new array on every frame when dealing with multi-frame pages, reducing V8 GC churn.
**Risk**: Negligible. The array size exactly matches `this.executionContextIds.length`. We explicitly assign the length to prevent stale promises from previous iterations if the length were to change, though in practice context IDs only grow.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Run targeted script `cd packages/renderer && npx tsx tests/verify-seek-driver-determinism.ts`.
