---
id: PERF-324
slug: prebind-frame-promise-executors
status: unclaimed
claimed_by: ""
created: 2024-04-21
completed: ""
result: ""
---

# PERF-324: Prebind Frame Promise Executors in CaptureLoop

## Focus Area
Frame capture loop worker synchronization in `CaptureLoop.ts`. Specifically, eliminating the dynamic closure allocation for the `Promise` executor used to track frame completion.

## Background Research
In the multi-worker actor model, `CaptureLoop.ts` creates a `Promise<Buffer | string>` for every frame queued to the pipeline (`maxPipelineDepth`). Currently, it instantiates an anonymous arrow function `(res, rej) => { contextRing[ringIndex].resolve = res; ... }` on every single frame submission inside `checkState` and `runWorker`. V8 must allocate a new closure for this every time. In PERF-321, we successfully eliminated similar closure allocations for `workerBlockedExecutors` by pre-binding them outside the hot loop. Applying the same technique to `framePromises` should compound those gains by entirely removing closure allocations from the inner loop.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html` (or standard DOM benchmark)
- **Render Settings**: 1080p, 30fps, 10 seconds (300 frames), `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~40.0s (based on PERF-323)
- **Bottleneck analysis**: Micro-allocations inside the hot loop (`runWorker` and `checkState`) trigger minor garbage collections, which disrupt V8 optimization and take CPU time away from Playwright IPC and frame processing.

## Implementation Spec

### Step 1: Preallocate Promise Executors
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Before `const checkState = () => {`, allocate an array of executors:
```typescript
const framePromiseExecutors = new Array(maxPipelineDepth);
for (let i = 0; i < maxPipelineDepth; i++) {
    framePromiseExecutors[i] = (res: (b: Buffer | string) => void, rej: (e: any) => void) => {
        contextRing[i].resolve = res;
        contextRing[i].reject = rej;
    };
}
```
2. In `checkState()`, replace the inline allocation:
```typescript
const promise = new Promise<Buffer | string>(framePromiseExecutors[ringIndex]);
```
3. In `runWorker()`, replace the inline allocation:
```typescript
const promise = new Promise<Buffer | string>(framePromiseExecutors[ringIndex]);
```
**Why**: Avoids allocating a new closure on every frame, allowing V8 to reuse the static functions and reduce GC pressure.
**Risk**: Negligible. The logic is functionally identical, just lifting the closure scope.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to verify Canvas rendering and codec support is unaffected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM capture correctly resolves buffers and Playwright/CDP integration remains stable.

## Prior Art
- **PERF-321**: Prebound `workerBlockedExecutors` using the identical array-of-functions technique, which improved performance.
