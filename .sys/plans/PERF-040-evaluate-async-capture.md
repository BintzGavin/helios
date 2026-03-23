---
id: PERF-040
slug: evaluate-async-capture
status: unclaimed
claimed_by: ""
created: 2026-03-31
completed: ""
result: ""
---

# PERF-040: Asynchronous Runtime.evaluate for Pipelined Frame Capture

## Focus Area
The Frame Capture Loop (Phase 4), specifically the `Runtime.evaluate` call in `SeekTimeDriver.ts`. This targets the Node.js event loop and Playwright IPC serialization overhead which dominate CPU-bound rendering time.

## Background Research
Currently, the `SeekTimeDriver` uses `CDPSession.send('Runtime.evaluate', { ... awaitPromise: true })` to execute the DOM and Media synchronization logic. By setting `awaitPromise: true`, Node.js blocks until the injected script resolves (which includes waiting for stability, custom `requestAnimationFrame` hooks, and fonts). Playwright waits sequentially for the JavaScript microtasks to finish *and* for the IPC roundtrip.
However, CDP commands on a session are guaranteed to execute sequentially. If we set `awaitPromise: false`, the `Runtime.evaluate` CDP call will return instantly to Node.js, dispatching the work to Chromium. Node can then *immediately* issue the subsequent `Page.captureScreenshot` command. Chromium will queue the screenshot command and execute it only after the previous asynchronous evaluation has finished. This removes Node.js event loop latency and IPC serialization overhead between the two commands, improving pipeline depth.

## Benchmark Configuration
- **Composition URL**: `examples/simple-animation/output/example-build/examples/simple-canvas-animation/composition.html` (standard DOM benchmark)
- **Render Settings**: 600x600, 30 FPS, 5 seconds duration, mode: `dom`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.251s
- **Bottleneck analysis**: Node.js and Playwright IPC overhead limits how fast the FFmpeg pipe can be saturated. Waiting for the `awaitPromise: true` response before issuing the screenshot capture introduces unnecessary serial gaps.

## Implementation Spec

### Step 1: Remove `awaitPromise` from `Runtime.evaluate`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime`, find the `this.cdpSession.send('Runtime.evaluate', ...)` call. Change `awaitPromise: true` to `awaitPromise: false`.
**Why**: Setting `awaitPromise: false` allows Node.js to fire the capture command immediately without waiting for the IPC evaluation round-trip, leveraging Chromium's sequential CDP queueing.
**Risk**: If Chromium does not queue the screenshot strictly after the evaluated microtasks, frames might be captured before stability checks complete, causing visual tearing.

### Step 2: Handle Error Propagation
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Since we aren't awaiting the promise to resolve from the evaluation, we can't throw synchronous exceptions back to Node if the evaluation fails. The Executor must ensure the `catch` block correctly handles rejected promises or modify how `response.exceptionDetails` is checked.
**Why**: Prevents unhandled promise rejections if the `Runtime.evaluate` call fails.
**Risk**: Silent failures in the evaluation script.

## Canvas Smoke Test
Run a basic Canvas smoke test to ensure `CdpTimeDriver` (used by Canvas rendering) is unaffected. Verify that a simple canvas animation still renders correctly and hasn't regressed.

## Correctness Check
Verify that the resulting MP4 from the `dom` mode benchmark does not contain tearing, missing fonts, or desynced media, ensuring that Chromium correctly waited for the evaluation to finish before capturing the screenshot.

## Prior Art
- PERF-035: Pipelined `Runtime.evaluate` and `Page.captureScreenshot` CDP commands in the worker execution loop.
