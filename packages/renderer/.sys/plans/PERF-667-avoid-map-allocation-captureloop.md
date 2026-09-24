---
id: PERF-667
slug: avoid-map-allocation-captureloop
status: complete
claimed_by: "jules"
created: 2024-06-04
completed: "2024-06-05"
result: "discarded"
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

## Results Summary

```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	2.248	150	66.72	0.0	discard	avoid map allocation in capture loop
2	2.106	150	71.22	0.0	discard	avoid map allocation in capture loop
3	1.988	150	75.45	0.0	discard	avoid map allocation in capture loop
4	1.986	150	75.52	0.0	discard	avoid map allocation in capture loop
5	1.968	150	76.21	0.0	discard	avoid map allocation in capture loop
```
