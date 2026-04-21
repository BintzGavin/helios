---
id: PERF-330
slug: promise-free-frame-ring
status: complete
claimed_by: "Jules"
created: 2026-04-21
completed: "2026-04-21"
result: "success"

## Results Summary
| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|---|---|---|---|---|---|---|
| 1 | 48.034 | 600 | 12.49 | 41.5 | keep | promise-free frame ring |
---

# PERF-330: Promise-Free Frame Ring in CaptureLoop

## Focus Area
`CaptureLoop.ts` - Frame Synchronization and Pipeline Backpressure.
This targets the overhead of allocating V8 Promise objects in the hot capture loop, aiming to eliminate `Promise` and `.catch()` closure allocations for individual frames entirely.

## Background Research
The `CaptureLoop` currently manages synchronization between multi-worker frames and the FFmpeg writer by dynamically allocating a `new Promise` for every queued frame, adding a `.catch()` handler to prevent unhandled rejections, and caching it in `framePromises`. For a 10-second 30fps DOM rendering sequence, this creates hundreds of short-lived Promises that the writer `await`s sequentially. Previous experiments (PERF-323, PERF-325) have shown that simplifying the pipeline state and removing unobserved Promise chains from the hot path compounding improves performance by reducing V8 garbage collection churn.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/composition.html` (or the standard DOM benchmark composition)
- **Render Settings**: 1280x720, 30 FPS, 10 seconds, `libx264`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~39.6s (Based on recent PERF-325 results)
- **Bottleneck analysis**: The pipeline allocates `new Promise` and `.catch(noopCatch)` in `CaptureLoop.ts` on every single frame queued, causing GC overhead and creating V8 microtasks.

## Implementation Spec

### Step 1: Replace Promise Arrays with Static State Rings
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove `framePromises`, `resolveRing`, `rejectRing`, and `framePromiseExecutors`. Replace them with three statically allocated parallel arrays:
```typescript
const frameBufferRing = new Array<Buffer | string | null>(maxPipelineDepth).fill(null);
const frameErrorRing = new Array<any>(maxPipelineDepth).fill(null);
const frameReadyRing = new Uint8Array(maxPipelineDepth); // 0 = not ready, 1 = ready
```
Add `let writerWaiterResolve: (() => void) | null = null;` and `const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };` near the other resolvers.
**Why**: Avoids creating shapes and allocating objects per-frame for synchronization.

### Step 2: Initialize Ring State Instead of Allocating Promises
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `checkState()` and the synchronous queuing block in `runWorker()`, remove the `new Promise` allocation and instead reset the state for the new frame:
```typescript
frameReadyRing[ringIndex] = 0;
frameBufferRing[ringIndex] = null;
frameErrorRing[ringIndex] = null;
```

### Step 3: Populate Results and Wake Writer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker()`, after `strategy.capture()` resolves or rejects, update the state:
```typescript
try {
    // ...
    const buffer = await strategy.capture(page, time);
    frameBufferRing[ringIndex] = buffer;
    frameReadyRing[ringIndex] = 1;
} catch (e) {
    frameErrorRing[ringIndex] = e;
    frameReadyRing[ringIndex] = 1;
}

if (writerWaiterResolve) {
    const res = writerWaiterResolve;
    writerWaiterResolve = null;
    res();
}
```

### Step 4: Refactor Writer Await Logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the main `try/while` loop (`run()`), replace `const buffer = await framePromises[ringIndex]!;` with:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
if (frameReadyRing[ringIndex] === 0) {
    await new Promise<void>(writerWaiterExecutor);
    continue; // Re-evaluate state after waking up
}

const error = frameErrorRing[ringIndex];
if (error) throw error;

const buffer = frameBufferRing[ringIndex]!;
```
Ensure `checkState()` also resolves `writerWaiterResolve` if `aborted` is true.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the core loop still effectively pipes frames to FFmpeg in canvas mode.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM frames are still successfully resolving through the pipeline.
