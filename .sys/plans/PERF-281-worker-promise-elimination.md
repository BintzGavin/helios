---
id: PERF-281
slug: worker-promise-elimination
status: complete
claimed_by: ""
created: 2026-04-14
completed: ""
result: "no-improvement"
---

# PERF-281: Replace `CaptureLoop.ts` Frame Promise Allocation with Preallocated Signal Array

## Focus Area
The hot frame generation pipeline in `CaptureLoop.ts`. Specifically, eliminating the dynamic `new Promise` allocation for `framePromises[ringIndex]` on every frame execution inside the multi-worker actor model loop.

## Background Research
Currently in `CaptureLoop.ts`, even with the multi-worker ACTOR MODEL, a dynamic `new Promise<Buffer | string>` is allocated for every single frame inside `getNextTask()` and `checkState()`.
```typescript
         const promise = new Promise<Buffer | string>((res, rej) => {
             contextRing[ringIndex].resolve = res;
             contextRing[ringIndex].reject = rej;
         });
         promise.catch(noopCatch); // Prevent unhandled rejections
         framePromises[ringIndex] = promise;
```
Then, the main loop `await framePromises[ringIndex]!` which forces a microtask and V8 allocation. Since the buffer state is strictly sequential, we can eliminate `framePromises` entirely. Instead, the `contextRing` can store the `buffer` directly and a `ready` boolean flag. If the main loop detects `!contextRing[ringIndex].ready`, it can just wait on a single, shared, reusable `frameWaiterResolve` promise or event, rather than waiting on a unique Promise per frame. This fully removes the per-frame `Promise` allocation and reduces garbage collection pressure.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.040s
- **Bottleneck analysis**: Microtask and Promise object allocation overhead during pipeline scheduling inside the main loop of `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Remove `framePromises` and replace with stateful `contextRing`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `framePromises`.
2. Change the shape of `contextRing` to store the raw buffer, error state, and a `ready` flag.

### Step 2: Implement Single Reusable Notification Promise
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `contextRing[ringIndex].resolve` / `reject` inside `checkState` and `getNextTask`.
2. Inside `runWorker()`, when a frame is complete or fails, mutate the `contextRing[ringIndex]`.
3. Inside the main loop (`while (nextFrameToWrite < this.totalFrames && !aborted)`), instead of awaiting `framePromises[ringIndex]`, wait on `!ctx.ready` and then extract the buffer directly.

**Why**: This design completely eliminates creating thousands of `Promise` objects over the course of rendering. By using a single `frameWaiterResolve` that gets dynamically reassigned, the main loop only allocates a Promise when it actually needs to yield execution.

## Canvas Smoke Test
Verify Canvas strategy remains unaffected and correctly renders.

## Correctness Check
Run the DOM benchmark (`cd packages/renderer && npx tsx scripts/benchmark-test.js`) and inspect the output video to verify visual correctness and frame ordering.
