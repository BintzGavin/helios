---
id: PERF-204
slug: eliminate-worker-ipc-serialization
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---
# PERF-204: Eliminate Worker IPC Serialization

## Focus Area
The hot frame capture loop in `packages/renderer/src/Renderer.ts`. Specifically, eliminating the `await activePromise;` bottleneck inside the `captureWorkerFrame` function.

## Background Research
Currently, the `captureLoop` limits in-flight frames using a sliding window (`maxPipelineDepth`). However, inside `captureWorkerFrame`, the code explicitly awaits the `activePromise` (the previous frame's capture promise for that specific worker) before dispatching the `setTime` and `beginFrame` CDP commands for the next frame.
This serializes CDP commands in Node.js, forcing the Node-Chromium IPC pipe to go completely idle while waiting for the previous frame's base64 data to return.
Since Chromium's CDP agent inherently queues and processes commands sequentially per session, serializing them on the Node.js side is redundant. By removing `await activePromise;`, Node.js will immediately dispatch the next frame's CDP commands to Chromium's queue while Chromium is still processing the previous frame. This ensures Chromium's main thread and IPC pipes are constantly saturated, eliminating IPC idle latency. The `while` loop's `maxPipelineDepth` condition safely prevents memory exhaustion by capping the total number of unwritten frames.

## Benchmark Configuration
- **Composition URL**: Standard simple-animation HTML fixture
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), codec libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 33.7s
- **Bottleneck analysis**: Waiting for `activePromise` in Node.js blocks subsequent CDP commands from entering Chromium's queue, leaving the renderer process and IPC pipes idle during the round-trip latency.

## Implementation Spec

### Step 1: Remove `activePromise` await in `captureWorkerFrame`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside the `captureWorkerFrame` async function, remove the `try { await activePromise; } catch (e) { /* ignore */ }` block entirely.
Optionally, remove the `activePromise` argument from the `captureWorkerFrame` function signature and its call site.

**Why**: Allows Node.js to push multiple `setTime` and `beginFrame` commands to Chromium concurrently. Chromium guarantees sequential execution of these commands, so the frames will still be captured in the correct timeline state without Node-side serialization overhead.

## Correctness Check
Run the DOM verification scripts to ensure frames are still sequenced correctly:
`npx tsx packages/renderer/tests/verify-cdp-driver.ts`

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.
