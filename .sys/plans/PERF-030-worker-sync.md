---
id: PERF-030
slug: worker-local-sync
status: complete
claimed_by: "executor-session"
created: 2026-03-22
completed: "2026-03-22"
result: "keep"
---

# PERF-030: Worker-Local Sequential Frame Evaluation

## Focus Area
The renderer's frame capture loop currently allows multiple frames to be submitted to the same Playwright worker concurrently (introduced in PERF-029). While this successfully pipelines Chromium and Node.js operations, it introduces race conditions on the same page. Since `window.seek(t)` mutates the shared DOM and `Page.captureScreenshot` reads it, evaluating multiple frames simultaneously on a single CDP session causes out-of-order execution, rendering identical or skipped frames.

## Background Research
When active pipeline depth was increased to `pool.length * 8` in PERF-029, it pushed up to 8 frames per worker into the CDP queue simultaneously.
Testing reveals that Chromium CDP handles `Runtime.evaluate` and `Page.captureScreenshot` asynchronously. If `seek(1)`, `capture(1)`, `seek(2)`, `capture(2)` are submitted concurrently to the same page without waiting for each pair to complete, Chromium may execute `seek(1)`, `seek(2)`, `capture(1)`, `capture(2)`, resulting in `capture(1)` seeing the state of `seek(2)`.
This breaks visual correctness. We must serialize `seek` + `capture` *per worker*, while still allowing the *pool* of workers to process frames concurrently.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (`packages/renderer/scripts/render-dom.ts`)
- **Render Settings**: Resolution, FPS, duration, codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.696s (from PERF-029)
- **Bottleneck analysis**: Incorrect frame capture due to race conditions. The goal is to restore correctness while maintaining as much performance from PERF-029 as possible.

## Implementation Spec

### Step 1: Add per-worker synchronization queue
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `createPage` function (inside `render`), add an `activePromise: Promise<void>` initialized to `Promise.resolve()` to the returned worker object.
```typescript
return { page, strategy, timeDriver, activePromise: Promise.resolve() };
```
**Why**: This promise will act as a worker-local queue to serialize operations on that specific page.

### Step 2: Enforce sequential evaluation per worker
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `captureLoop` while loop, when scheduling a frame on a worker, chain the new frame's execution onto the worker's `activePromise`.
Change:
```typescript
const framePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds)
  .then(() => worker.strategy.capture(worker.page, time));
```
To:
```typescript
const framePromise = worker.activePromise.then(async () => {
    await worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    return await worker.strategy.capture(worker.page, time);
});
worker.activePromise = framePromise.catch(() => {});
```
**Why**: This guarantees that a single Playwright page never begins seeking or capturing a new frame until it has fully finished capturing the previous one, fixing the race condition while keeping workers parallel.

**Risk**: This will reduce the effective pipeline depth per worker from 8 to 1, potentially increasing total render time compared to PERF-029.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/render.ts` to verify the Canvas Strategy still behaves properly.

## Correctness Check
Review the output video file `output/dom-animation.mp4` to ensure frame synchronization is correct (the timestamp/text should update smoothly on every frame without skipping or repeating).

## Prior Art
- PERF-029: Deepen Active Pipeline Depth (introduced the concurrent queuing).

## Results Summary
- **Best render time**: 32.324s (vs baseline 3.696s)
- **Improvement**: -774.6%
- **Kept experiments**: worker-local sequential promise chain
- **Discarded experiments**: []
