---
id: PERF-667
slug: avoid-map-allocation-captureloop
status: unclaimed
claimed_by: ""
created: 2024-06-04
completed: ""
result: ""
---
# PERF-667: Avoid Array.map Allocation in CaptureLoop

## Focus Area
The worker initialization in `CaptureLoop.ts` (`const workerPromises = this.pool.map((w, i) => runWorker(w, i));`).

## Background Research
`Array.prototype.map` allocates a new array and has slight iterator overhead. In the V8 hot loop startup, doing a traditional `for` loop to build the `workerPromises` array could save a minor allocation cost.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 150 frames, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s
- **Bottleneck analysis**: Array allocations during the main loop setup can cause minor GC pauses.

## Implementation Spec

### Step 1: Replace map with for loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace `const workerPromises = this.pool.map((w, i) => runWorker(w, i));` with:
```typescript
const workerPromises = new Array(this.pool.length);
for (let i = 0; i < this.pool.length; i++) {
    workerPromises[i] = runWorker(this.pool[i], i);
}
```
**Why**: Avoids `Array.map` iterator and implicit array allocation overhead.
**Risk**: Very low.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark to ensure no regressions in canvas rendering mode.

## Correctness Check
Verify output video opens and contains 150 frames.

## Prior Art
Optimizations like PERF-650 have shown that reducing array operations and variables in `CaptureLoop.ts` can yield minor improvements.
