---
id: PERF-241
slug: context-ring-buffer-closures
status: unclaimed
claimed_by: ""
created: "2026-04-11"
completed: ""
result: ""
---

# PERF-241: Eliminate Hot-Loop Closure and Promise Allocations via Context Ring Buffer

## Focus Area
DOM Rendering Pipeline - Frame Submission Hot Loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In the `CaptureLoop.run()` hot loop, we currently allocate an anonymous closure `() => { ... }` inside a `.then()` block for every single frame to coordinate the `timeDriver.setTime` and `strategy.capture` calls. Additionally, we use `.catch(noopCatch).then(...)` which allocates *two* Promises per frame.

Because `CaptureLoop` already uses a ring buffer bounded by `maxPipelineDepth` to coordinate concurrent workers, we can pre-allocate an array of static "Execution Context" objects matching the ring buffer size. By caching the `worker`, `compTime`, and `time` into the ring buffer context and passing pre-bound execution methods to a single `.then(onFulfilled, onRejected)` call, we can completely eliminate dynamic closure allocations and reduce Promise chain allocations by half inside the hot loop. The mathematics of the pipeline guarantee that by the time the loop overwrites a context in the ring buffer, its callback has strictly finished executing.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.082s
- **Bottleneck analysis**: Micro-stalls from V8 anonymous closure allocations (`() => { ... }`) and multi-stage Promise chaining (`catch().then()`) in the synchronous loop.

## Implementation Spec

### Step 1: Pre-allocate Context Ring Buffer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `run()`, immediately after initializing `framePromises` and `ringMask`, pre-allocate a `contexts` array.

<<<<<<< SEARCH
    let maxPipelineDepth = poolLen * 2;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    const ringMask = maxPipelineDepth - 1;
    let framePromises: Promise<Buffer | string>[] = new Array(maxPipelineDepth);
    const timeStep = 1000 / fps;
=======
    let maxPipelineDepth = poolLen * 2;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    const ringMask = maxPipelineDepth - 1;
    let framePromises: Promise<Buffer | string>[] = new Array(maxPipelineDepth);

    const contexts = new Array(maxPipelineDepth);
    for (let i = 0; i < maxPipelineDepth; i++) {
        const ctx = {
            worker: null as any,
            compTime: 0,
            time: 0,
            execute: function() {
                this.worker.timeDriver.setTime(this.worker.page, this.compTime).then(undefined, noopCatch);
                return this.worker.strategy.capture(this.worker.page, this.time);
            }
        };
        (ctx as any).boundExecute = ctx.execute.bind(ctx);
        (ctx as any).boundCatch = function() {
            return (ctx as any).boundExecute();
        };
        contexts[i] = ctx;
    }

    const timeStep = 1000 / fps;
>>>>>>> REPLACE

**Why**: Creates static bounded context objects and bound methods that can be referenced without allocating new closures on the V8 heap per frame.

### Step 2: Use Contexts in Hot Loop and Combine Promise Chain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the hot loop, replace the `catch(noopCatch).then(...)` chain with direct context mutation and a single `.then(success, failure)` call.

<<<<<<< SEARCH
            const framePromise = worker.activePromise
                .catch(noopCatch)
                .then(() => {
                    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                    return worker.strategy.capture(worker.page, time);
                });

            worker.activePromise = framePromise as unknown as Promise<void>;
            framePromises[nextFrameToSubmit & ringMask] = framePromise;
            nextFrameToSubmit++;
=======
            const ringIndex = nextFrameToSubmit & ringMask;
            const ctx = contexts[ringIndex];
            ctx.worker = worker;
            ctx.compTime = compositionTimeInSeconds;
            ctx.time = time;

            const framePromise = worker.activePromise.then(
                ctx.boundExecute,
                ctx.boundCatch
            );

            worker.activePromise = framePromise as unknown as Promise<void>;
            framePromises[ringIndex] = framePromise;
            nextFrameToSubmit++;
>>>>>>> REPLACE

**Why**: Avoids `() => { ... }` allocation and reduces the Promise chain from 2 links to 1, cutting V8 microtask overhead while safely passing `worker`, `compTime`, and `time` synchronously by mutating the ring buffer context.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode runs correctly and isn't affected.

## Correctness Check
Run the standard test suite to ensure the sequence of frames correctly syncs with media without regressions.

## Prior Art
- PERF-240 (Inlined `captureWorkerFrame` but re-introduced closure allocations).
- PERF-236 (Bitwise modulo indexing ring buffer).
- PERF-159 (Moved closures out of hot loops).
