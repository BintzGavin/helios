---
id: PERF-404
slug: preallocate-promiserace-array
status: unclaimed
claimed_by: ""
created: 2026-04-29
completed: ""
result: ""
---

# PERF-404: Preallocate Promise.race Array in CdpTimeDriver

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` single-frame stability check hot path.

## Background Research
During single-frame evaluation within the capture loop, `CdpTimeDriver.setTime()` uses `Promise.race([evaluatePromise, timeoutPromise])` to enforce a stability timeout on CDP evaluation. Every execution of `Promise.race` in this manner dynamically allocates a new array literal `[evaluatePromise, timeoutPromise]` on the V8 heap. This happens on every single frame during the renderer loop, adding unnecessary garbage collection pressure. By reusing a preallocated array class property, we can eliminate this dynamic allocation and further reduce V8 GC churn in the hot loop.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: Standard benchmark settings.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~44.500s
- **Bottleneck analysis**: Repeated dynamic array literal allocation (`[evaluatePromise, timeoutPromise]`) inside the hot loop adds minor but consistent garbage collection pressure per frame.

## Implementation Spec

### Step 1: Preallocate `raceArray` in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a new class property: `private raceArray: [Promise<any> | null, Promise<void> | null] = [null, null];`
2. In `runSetTime()`, replace the inline array allocation:
   ```typescript
   const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);

   try {
       const res = await Promise.race([evaluatePromise, timeoutPromise]);
   ```
   With:
   ```typescript
   const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);
   this.raceArray[0] = evaluatePromise;
   this.raceArray[1] = timeoutPromise;

   try {
       const res = await Promise.race(this.raceArray as readonly [Promise<any>, Promise<void>]);
   ```
   Then null out the references in the `finally` block to avoid holding memory:
   ```typescript
   this.raceArray[0] = null;
   this.raceArray[1] = null;
   ```
**Why**: Avoids dynamic array allocation of `[evaluatePromise, timeoutPromise]` on every single frame loop.
**Risk**: Minimal, provided array references are correctly cast to avoid TypeScript errors and nulled to avoid memory leaks.

## Variations
- None.

## Canvas Smoke Test
None.

## Correctness Check
Run `cd packages/renderer && npx tsx tests/verify-cdp-driver-stability.ts` to ensure stability checks still execute and timeout correctly.

## Prior Art
- `PERF-403`: Preallocated multi-frame CDP arrays.
- `PERF-386`: Eliminated Promise chain allocation in CdpTimeDriver.
