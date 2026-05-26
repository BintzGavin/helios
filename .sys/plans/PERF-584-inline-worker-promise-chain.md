---
id: PERF-584
slug: inline-worker-promise-chain
status: complete
claimed_by: ""
created: 2026-10-31
completed: "2026-05-25"
result: "keep"
---

# PERF-584: Inline Worker Promise Chain in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Hot loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In `CaptureLoop.ts`, the multi-worker ACTOR MODEL spins up independent asynchronous tasks inside `runWorker` that orchestrate frame capture. Currently, the inner loop executes:
```typescript
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
                frameErrorRing[ringIndex] = e;
                frameReadyRing[ringIndex] = 1;
            }
```
This requires multiple `await` resumptions inside the generator and specifically wraps them in a `try/catch` block. Research (like in PERF-125) has demonstrated that V8's generator state machine allocates more execution context overhead for `try/catch` blocks inside hot asynchronous loops.
By chaining the calls using `.then()` and `.catch()` behind a single `await`, we can avoid the `try/catch` overhead and consolidate the generator resumptions, reducing GC pressure and microtask overhead per frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.446s
- **Bottleneck analysis**: V8 generator state machine transitions (`try/catch` and multiple `await`s) in the core inner loop of `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Replace `try/catch` with a single Promise chain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `runWorker` function, replace the `try/catch` block:
```typescript
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
                frameErrorRing[ringIndex] = e;
                frameReadyRing[ringIndex] = 1;
            }
```
with the following single `await` expression:
```typescript
            await Promise.resolve(timeDriver.setTime(page, compositionTimeInSeconds))
                .then(() => strategy.capture(page, time))
                .then((buffer) => {
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                })
                .catch((e) => {
                    frameErrorRing[ringIndex] = e;
                    frameReadyRing[ringIndex] = 1;
                });
```
**Why**: Consolidating to a single `await` and utilizing `.then()` and `.catch()` eliminates the explicit `try/catch` block from the generator context. Wrapping in `Promise.resolve()` ensures it cleanly chains regardless of whether `setTime` returns `Promise<void>` or `void`.

## Correctness Check
Execute the renderer benchmark to verify that no frames are dropped, the video outputs correctly, and any errors thrown by the browser context correctly abort the capture loop.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break Canvas compilation.

## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	1.377	150	108.93	42.5	keep	inline worker promise chain
2	1.317	150	113.88	45.3	keep	inline worker promise chain
3	1.373	150	109.27	42.6	keep	inline worker promise chain
```
