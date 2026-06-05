---
id: PERF-678
slug: eliminate-run-worker-promise-allocation
status: unclaimed
claimed_by: ""
created: 2025-06-05
completed: ""
result: ""
---
# PERF-678: Eliminate `workerPromises` Array Mapping in `CaptureLoop`

## Focus Area
The `run()` method in `packages/renderer/src/core/CaptureLoop.ts` creates `workerPromises` using `this.pool.map`.

## Background Research
Currently, `CaptureLoop.ts` initiates the worker actors by invoking `runWorker` for each worker in `this.pool`:
```typescript
const workerPromises = this.pool.map((w, i) => runWorker(w, i));
```
While this is a very standard way to map workers to promises, V8 does incur a slight allocation cost for iterating over an array with a callback and constructing a new array to store the resulting Promises. Although this happens outside the hot frame loop (it only happens once during startup), any reduction in pre-loop allocation and closure instantiation helps tighten V8 memory layout and startup performance. We can pre-allocate an array of exact length and assign the promises in a simple `for` loop.

## Benchmark Configuration
- **Composition URL**: dom-benchmark
- **Render Settings**: 600x600, 30fps, 150 frames
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s (median of highly optimized baseline)
- **Bottleneck analysis**: Micro-optimizing allocations immediately before the `nextFrameToWrite` hot loop begins to minimize JS-side garbage collection during the initial capture phase.

## Implementation Spec

### Step 1: Replace `Array.prototype.map` with pre-allocated array loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Find the line:
```typescript
    const workerPromises = this.pool.map((w, i) => runWorker(w, i));
```

Replace it with:
```typescript
    const workerPromises = new Array(poolLen);
    for (let i = 0; i < poolLen; i++) {
        workerPromises[i] = runWorker(this.pool[i], i);
    }
```
**Why**: Avoids `Array.prototype.map` which allocates an intermediate closure and dynamically sizing array internally. Pre-allocating `workerPromises` and iterating with a `for` loop reduces overhead directly before the tight frame-processing `while` loop starts.
**Risk**: Very low. `poolLen` is already a constant in scope (`const poolLen = this.pool.length;`).

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts canvas` to ensure no changes broke the shared loop initialization.

## Correctness Check
Run `npm run test` or check the output video of the DOM benchmark.

## Prior Art
- PERF-667 (in journal open questions): "Would avoiding `Array.map` array allocation overhead for `workerPromises` in `CaptureLoop.ts` improve startup latency?"
