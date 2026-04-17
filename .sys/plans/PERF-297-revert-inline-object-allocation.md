---
id: PERF-297
slug: revert-inline-object-allocation
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-297: Revert Inline Object Allocation in SeekTimeDriver and DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` and `packages/renderer/src/drivers/SeekTimeDriver.ts` - GC Overhead in the Hot Loop

## Background Research
PERF-296 attempted to reduce write barrier overhead by replacing mutations on long-lived class properties with inline literal object allocations in the hot loops. However, the benchmark results showed that the inline object allocation actually degraded performance (render time worsened from ~47.232s to ~48.743s). This indicates that the V8 overhead of instantiating new objects inside the tight loop is significantly higher than the write barrier cost of mutating the long-lived `HeapNumber` and `String` properties. To improve performance, we need to revert the changes introduced in PERF-296, restoring the pre-allocated cached object properties and mutating them during the hot loop.

## Benchmark Configuration
- **Composition URL**: `tests/fixtures/benchmark.ts` (DOM benchmark)
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.743s (from PERF-296 results)
- **Bottleneck analysis**: Object instantiation overhead inside the tight loop caused by inline object allocation.

## Implementation Spec

### Step 1: Restore Cached Object Mutation in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add back the `evaluateParams` property to the `SeekTimeDriver` class: `private evaluateParams: any = { expression: '', awaitPromise: true };`
2. In `setTime()`, mutate the `expression` property of `this.evaluateParams` instead of allocating a new object inline.

**Why**: This avoids the object instantiation overhead in the multi-frame and single-frame execution paths, returning to the faster property mutation approach.

### Step 2: Restore Cached Object Mutation in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. In `capture()`, instead of passing a new object literal to `cdpSession!.send('HeadlessExperimental.beginFrame', { ...this.beginFrameParams, frameTimeTicks: 10000 + frameTime })`, mutate `this.beginFrameParams.frameTimeTicks` and pass `this.beginFrameParams` directly.
2. Apply the same logic to `this.targetBeginFrameParams` if the target selector path is taken.

**Why**: Avoids creating a new object literal per frame, reducing garbage collection pressure and object instantiation overhead.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas rendering still works correctly.

## Correctness Check
Run the DOM benchmark (`npx tsx tests/fixtures/benchmark.ts`) to verify performance gains and ensure the output video is generated correctly.

## Prior Art
- PERF-296 (which this reverts)
- Memory documentation confirming write barrier vs allocation overhead tradeoffs in tight loops.
