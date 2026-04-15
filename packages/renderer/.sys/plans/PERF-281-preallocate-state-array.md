---
id: PERF-281
slug: preallocate-state-array
status: complete
claimed_by: ""
created: 2026-04-14
completed: "2026-04-14"
result: "discard"
---

# PERF-281: Preallocate State Array and Eliminate Dynamic Promises in CaptureLoop

## Focus Area
`CaptureLoop.ts` handles the multi-worker ACTOR MODEL with backpressure. Currently, it dynamically allocates a `new Promise` for every single frame inside `getNextTask()` and `checkState()`. These promises are stored in `framePromises` and awaited by the main loop. This creates thousands of Promise allocations and closures (the executor function) during the hot capture loop, increasing V8 Garbage Collection pressure.

## Background Research
By replacing the `new Promise` per frame with a pre-allocated state array (`contextRing`), we can completely eliminate these dynamic per-frame Promise allocations. The worker simply updates the state in the `contextRing` (e.g., `ctx.buffer = ...; ctx.done = true;`) and wakes up the main loop using a single, reusable `frameWaiterResolve` promise ONLY when the main loop is actively waiting. Memory notes explicitly: "replacing the dynamic new Promise allocation inside getNextTask and checkState with a pre-allocated state array (contextRing) and a single reusable wait promise (frameWaiterResolve) eliminates creating thousands of Promise objects, reducing GC overhead (PERF-281)."

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, 90 frames, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.0s
- **Bottleneck analysis**: GC overhead and memory allocations inside the tight hot loop of `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Preallocate `contextRing` and remove `framePromises`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `const framePromises = new Array<Promise<Buffer | string>>(maxPipelineDepth);`
2. Change the initialization of `contextRing` to hold state instead of resolve/reject functions:
```typescript
    for (let i = 0; i < maxPipelineDepth; i++) {
        contextRing[i] = {
            buffer: null as Buffer | string | null,
            error: null as any,
            done: false
        };
    }
```
3. In `checkState()` and `getNextTask()`, remove the creation of `new Promise<Buffer | string>(...)` and assignment to `framePromises`. We simply let the task logic proceed without creating a Promise.

### Step 2: Update Worker to set state and wake main loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker`, update the `try/catch` block to populate `ctx` and wake the main loop:
```typescript
            try {
                worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                const rawResponse = await worker.strategy.capture(worker.page, time);
                const buffer = worker.strategy.formatResponse ? worker.strategy.formatResponse(rawResponse) : rawResponse;
                ctx.buffer = buffer;
                ctx.done = true;
            } catch (e) {
                ctx.error = e;
                ctx.done = true;
            }

            if (frameWaiterResolve) {
                const fRes = frameWaiterResolve;
                frameWaiterResolve = null;
                fRes();
            }
```

### Step 3: Update Main Loop to await `frameWaiterResolve` when needed
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the main `try` block while loop (`while (nextFrameToWrite < this.totalFrames && !aborted)`), replace the `framePromises` await with:
```typescript
            // Wait for the task to be queued by a worker or immediately queued
            if (nextFrameToSubmit <= nextFrameToWrite) {
                await new Promise<void>(resolve => {
                    frameWaiterResolve = resolve;
                });
                continue;
            }

            const ringIndex = nextFrameToWrite & ringMask;
            const ctx = contextRing[ringIndex];

            if (!ctx.done) {
                await new Promise<void>(resolve => {
                    frameWaiterResolve = resolve;
                });
                continue;
            }

            if (ctx.error) {
                throw ctx.error;
            }

            const buffer = ctx.buffer!;

            // Clear context for next use
            ctx.done = false;
            ctx.buffer = null;
            ctx.error = null;
```

**Why**: This change ensures we only allocate a `Promise` when the main loop actually needs to wait for a worker, and eliminates the creation of thousands of `Promise` objects and closures per frame inside `getNextTask` and `checkState`.
**Risk**: If `frameWaiterResolve` is not properly cleared or triggered, the loop could deadlock.

## Variations
None. This strictly implements the architecture described in the Memory for PERF-281.

## Canvas Smoke Test
Run a quick render in `canvas` mode to ensure the pipeline changes didn't break basic rendering.

## Correctness Check
Run the DOM benchmark and inspect `test-output.mp4` to ensure all frames are encoded correctly.

## Prior Art
PERF-280 discarded pre-allocating promises inside the ring buffer, pointing instead to this strategy (PERF-281).

## Results Summary
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	42.298	90	2.13	37.3	keep	baseline
2	32.084	90	2.81	37.4	keep	baseline
3	32.115	90	2.80	36.8	keep	baseline
4	32.916	90	2.73	37.1	discard	preallocate state array
5	32.284	90	2.79	37.4	discard	preallocate state array
6	32.146	90	2.80	37.2	discard	preallocate state array
