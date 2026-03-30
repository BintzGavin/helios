---
id: PERF-114
slug: pipeline-evaluate-capture
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2024-05-30"
result: "improved"
---

# PERF-114: Pipeline Evaluate and Capture

## Focus Area
Frame Capture Loop in `Renderer.ts`.

## Background Research
Currently, inside the `processWorkerFrame` function, we `await worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);` before we return `worker.strategy.capture(worker.page, time);`.
Because `setTime` waits for the CDP `Runtime.evaluate` round-trip to complete before initiating the next `strategy.capture` (which triggers `HeadlessExperimental.beginFrame`), Node.js sits idle waiting for IPC.
Because CDP executes messages sequentially per-session, we can queue both `Runtime.evaluate` and `HeadlessExperimental.beginFrame` simultaneously from Node.js, eliminating one IPC round-trip delay per frame. Chromium will evaluate `window.__helios_seek` and then immediately process the `beginFrame` capture.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~35.255s
- **Bottleneck analysis**: IPC round-trip latency in the sequential frame capture loop.

## Implementation Spec

### Step 1: Pipeline CDP Promises in `Renderer.ts`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Update `processWorkerFrame` to invoke `worker.timeDriver.setTime` and `worker.strategy.capture` concurrently (i.e. fire both promises before awaiting either), and then await both.
**Why**: Node.js sends both CDP messages to Chromium immediately. Chromium receives them and executes them in order, removing the Node-Chromium IPC latency for the second command.
**Risk**: If any logic inside `strategy.capture` depends on the *JavaScript state* resolved by `setTime` before sending its own CDP command, it might fail. However, `strategy.capture` simply sends `HeadlessExperimental.beginFrame` (in `dom` mode without target selector), which does not evaluate JavaScript in Node.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure it works.

## Correctness Check
Run the `npx tsx packages/renderer/tests/fixtures/benchmark.ts` test or check the output video visually.

## Results Summary
- **Best render time**: 34.814s
- **Kept experiments**: PERF-114
- **Discarded experiments**: None
