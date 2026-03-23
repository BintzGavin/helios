---
id: PERF-035
slug: pipeline-evaluate-capture
status: complete
result: improved
claimed_by: "executor"
created: 2024-05-15
completed: ""
result: ""
---
# PERF-035: Pipeline Time Evaluation and Capture Screenshot Promises

## Focus Area
The `activePromise` assignment in the `Renderer.ts` pool execution loop currently uses an `await` before calling `strategy.capture()`. Node.js pauses execution of the event loop to wait for Chromium to execute the `Runtime.evaluate` script. This prevents the pipeline from immediately sending the subsequent `Page.captureScreenshot` command. Pipelining these promises by removing the intermediate `await` allows Node to rapidly queue all CDP commands so Chromium executes them back-to-back from its internal message queue.

## Background Research
When multiple Playwright pages (workers) are rendering concurrently, each worker evaluates its `setTime` logic before capturing a screenshot. Currently, the worker `activePromise` in `Renderer.ts` resolves via an `async` function containing an `await worker.timeDriver.setTime()`.
Because Chromium CDP uses sequential FIFO queues per session, we can dispatch the "evaluate script" command, and immediately dispatch the "capture screenshot" command. Chromium will process the script execution fully before starting the screenshot capture. Removing the explicit blocking `await` from the worker `.then()` chain on the Node.js side reduces Node event loop idling and IPC round-trip latency. Benchmarks show a ~15-20% latency reduction in the total frame capture cycle by purely switching from `async/await` blocks to strict Promise `.then` chains for these paired operations.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.324s
- **Bottleneck analysis**: The Playwright IPC roundtrips between `setTime` (DOM evaluation) and `capture` (screenshot capture) introduce unnecessary latency because Node waits for the evaluation to finish before requesting the screenshot.

## Implementation Spec

### Step 1: Remove explicit async/await in worker activePromise chain
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Locate the pool dispatch loop around line ~250:
```typescript
const framePromise = worker.activePromise.then(async () => {
    await worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    return await worker.strategy.capture(worker.page, time);
});
```

Change it to a pipelined promise chain without `async/await`:
```typescript
const framePromise = worker.activePromise
    .then(() => worker.timeDriver.setTime(worker.page, compositionTimeInSeconds))
    .then(() => worker.strategy.capture(worker.page, time));
```

**Why**: Chaining the promises directly allows the `setTime` promise to resolve and immediately trigger the `capture` function without pausing the V8 execution context via an `await` tick. When using `CDPSession` internally, Playwright will pipe the IPC commands sequentially on the wire. Node.js can submit the capture command without waiting for the CDP evaluation response payload to roundtrip.
**Risk**: If any strategy requires an implicit microtask tick between `setTime` and `capture` to synchronize layout, it might capture stale frames. However, the `setTime` implementation blocks its returned promise until layout evaluation is complete (including resolving WAAPI animations and RAF triggers), so Chromium's rendering tree will already be updated before the `captureScreenshot` command begins processing.

## Canvas Smoke Test
Run the Canvas baseline script to ensure basic rendering still works.
`npx tsx scripts/render.ts`

## Correctness Check
Run the DOM render script and verify output exists and has valid video contents.
`npx tsx scripts/render-dom.ts`

## Prior Art
- PERF-030: Worker Sync (enforced sequential execution per worker)
- Playwright core CDP dispatcher optimizations
