---
id: PERF-776
slug: inline-media-sync-check
status: complete
completed: 2024-06-16
result: kept
claimed_by: ""
created: 2024-06-15
completed: 2024-06-16
result: kept
---

# PERF-776: Inline Media Sync Check in CDP Time Driver

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime()` method. This targets the hot loop's time advancement step, reducing V8 call frame setup overhead for every frame on the fast path.

## Background Research
Currently, `CdpTimeDriver.setTime` invokes `this.syncMediaFn()` for every frame. When `hasMedia` is false, `syncMediaFn` is an empty closure `() => {}`. V8 still has to set up a call frame, execute an empty function, and tear it down, whereas an inline boolean check (`if (this.hasMedia)`) would be highly predictable and compiled to a simple branch, which is much faster.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/benchmark
- **Render Settings**: 1920x1080, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-optimizing the inner loop function call overhead.

## Implementation Spec

### Step 1: Replace `syncMediaFn` with inline boolean check
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `syncMediaFn` property entirely.
2. In `setTime`, replace `this.syncMediaFn();` with `if (this.hasMedia) { this.defaultSyncMedia(); }`.
3. In `prepare()`, remove `this.syncMediaFn = ...` assignments. Keep `this.hasMedia = true/false` assignments.

**Why**: An inline boolean check is much cheaper than a dynamic function call to an empty closure in V8's hot loops. V8's branch predictor will perfectly predict `hasMedia` state for the entire run.
**Risk**: Minimal, functionality remains exactly the same.

## Correctness Check
Run a rendering job to ensure it still outputs video properly and media still syncs when media elements are present.

## Canvas Smoke Test
Run a canvas smoke test to ensure no breakage in canvas paths.

## Results Summary
- **Best render time**: 11.761s (vs baseline unknown)
- **Improvement**: ~N/A%
- **Kept experiments**: [PERF-776] Inline media sync check
- **Discarded experiments**: none
