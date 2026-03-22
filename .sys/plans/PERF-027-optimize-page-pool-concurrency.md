---
id: PERF-027
slug: optimize-page-pool-concurrency
status: unclaimed
claimed_by: ""
created: 2026-03-22
completed: ""
result: ""
---

# PERF-027: Optimize Playwright Page Pool Concurrency Strategy

## Focus Area
The renderer initializes a pool of Playwright pages to perform DOM rendering in parallel. In `packages/renderer/src/Renderer.ts`, the pool size is currently set to `os.cpus().length || 4`, and the active frame capture loop restricts the in-flight frames to `pool.length`. However, empirical tests show that increasing the pool size and active pipeline depth beyond the literal CPU core count can dramatically improve render speed due to the heavy I/O and IPC wait times involved in Playwright's CDP and page evaluation.

## Background Research
When rendering frames sequentially within each worker page, there is significant idle time spent waiting for `timeDriver.setTime` evaluations and `strategy.capture` IPC responses. If we over-subscribe the concurrency slightly (e.g., using `1.5x` or `2x` the CPU core count, bounded to a sensible max like `8`) and increase the active pipeline depth to `pool.length * 2`, Node.js and Playwright can better interleave these I/O operations, keeping the FFmpeg encoding pipeline fully saturated.

During exploratory benchmarking, simply increasing the pipeline depth constraint from `pool.length` to `pool.length * 2` and increasing the page pool size limit allowed wall-clock rendering times for a 150-frame animation to drop from ~34 seconds to under 4 seconds in the microVM environment.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.1s
- **Bottleneck analysis**: The capture loop limits in-flight frame captures to strictly `pool.length`. The CPU cores are under-utilized because of Playwright's IPC overhead.

## Implementation Spec

### Step 1: Optimize Page Pool Concurrency Limit
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `render` method where the page pool is initialized, update the `concurrency` calculation to over-subscribe the CPU count slightly. For example:
```typescript
const cpus = os.cpus().length || 4;
const concurrency = this.options.concurrency || Math.min(Math.ceil(cpus * 1.5), 8);
```
**Why**: Over-subscribing accounts for the I/O-bound nature of the Playwright IPC calls, ensuring that Chromium and Node.js have enough overlapping tasks to saturate the CPU without thrashing.
**Risk**: Too high a concurrency could cause Chromium to run out of memory or thrash CPU context switching. Bounding it to 8 mitigates this.

### Step 2: Increase Active Pipeline Depth
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `captureLoop` while loop, change the pipeline refill constraint from `pool.length` to `pool.length * 2`:
```typescript
while (nextFrameToSubmit < totalFrames && (nextFrameToSubmit - nextFrameToWrite) < pool.length * 2) {
```
**Why**: This allows multiple frames to be queued up per worker page, so as soon as one frame capture finishes, the worker is already processing the next seek command, reducing idle time between captures.
**Risk**: Increases memory usage because more `Buffer` objects will be held in memory waiting to be written to FFmpeg. However, `pool.length * 2` is still a very small queue (e.g. 12-16 frames), which is well within safe memory limits.

## Variations
### Variation A: Adjustable Pipeline Multiplier
Instead of hardcoding `pool.length * 2`, we could test `pool.length * 3` or `pool.length * 4` if memory allows. The Executor should test whether `* 2` or `* 4` yields better median wall-clock time.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/render.ts`. Expect to see FFmpeg error out (as no GPU is present), but capture logic should remain functional and initialize the correct number of pages.

## Correctness Check
Verify `dom-animation.mp4` renders correctly with synchronized animations and no missing frames.
