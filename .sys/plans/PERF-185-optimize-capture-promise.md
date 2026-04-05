---
id: PERF-185
slug: optimize-capture-promise
status: unclaimed
claimed_by: ""
created: 2026-04-05
completed: ""
result: ""
---
# PERF-185: Optimize Capture Promise Construction in Hot Loop

## Focus Area
`packages/renderer/src/Renderer.ts` hot capture loop (`captureLoop`).

## Background Research
Currently, the `captureLoop` dynamically creates a promise chain for every single frame within a `while` loop that iterates over `poolLen`. This requires allocating an anonymous closure `() => { ... }` on every iteration, leading to GC overhead and V8 un-optimization inside the hot loop. By moving the promise chain into an `async` helper function outside the `while` loop, V8 can optimize the function signature without allocating a new anonymous closure and `Promise.then` wrapper on every single frame.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5s (150 frames), `dom` mode
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.78 seconds (baseline from recent tests)
- **Bottleneck analysis**: GC allocations for anonymous closures inside the hot loop.

## Implementation Spec

### Step 1: Extract Frame Capture Logic
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Move the capture logic into an `async` function defined before the `while (nextFrameToWrite < totalFrames)` loop, but inside the `captureLoop` scope:
```typescript
          const captureWorkerFrame = async (worker: any, compositionTimeInSeconds: number, time: number): Promise<Buffer> => {
              await worker.activePromise;
              worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
              return worker.strategy.capture(worker.page, time);
          };
```

### Step 2: Use the helper in the hot loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside the `while` loop, replace the `framePromise` assignment:
```typescript
<<<<<<< SEARCH
                  const framePromise = worker.activePromise.then(() => {
                      worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
                      return worker.strategy.capture(worker.page, time);
                  });

                  // Add a no-op catch handler to prevent unhandled promise rejections on abort/error
                  worker.activePromise = framePromise.then(undefined, noopCatch) as Promise<void>;
=======
                  const framePromise = captureWorkerFrame(worker, compositionTimeInSeconds, time);

                  // Add a no-op catch handler to prevent unhandled promise rejections on abort/error
                  worker.activePromise = framePromise.then(undefined, noopCatch) as Promise<void>;
>>>>>>> REPLACE
```

**Why**: An `async` function compiled once is heavily optimized by V8, avoiding the cost of instantiating new anonymous `() =>` closures and manually chaining `.then()` inside a highly iterative block.

## Canvas Smoke Test
Run `npm run test:renderer` to ensure `CanvasStrategy` is unaffected.

## Correctness Check
Run the `npx tsx packages/renderer/tests/fixtures/benchmark.ts` script to ensure frames are still captured accurately.
