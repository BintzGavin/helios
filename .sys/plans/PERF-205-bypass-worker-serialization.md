---
id: PERF-205
slug: bypass-worker-serialization
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---
# PERF-205: Bypass Worker IPC Serialization

## Focus Area
The frame capture loop in `packages/renderer/src/Renderer.ts`. Specifically, eliminating the `await activePromise;` bottleneck inside the `captureWorkerFrame` function.

## Background Research
Currently, the `captureLoop` limits in-flight frames using a sliding window (`maxPipelineDepth`). However, inside `captureWorkerFrame`, the code explicitly awaits `activePromise` (the previous frame's capture promise for that specific worker) before dispatching the `setTime` and `beginFrame` CDP commands for the next frame.
This serializes CDP commands in Node.js, forcing the Node-Chromium IPC pipe to go idle while waiting for the previous frame's base64 data to return. By removing `await activePromise;`, Node.js will immediately dispatch the next frame's CDP commands to Chromium's queue while Chromium is still processing the previous frame. The `while` loop's `maxPipelineDepth` safely prevents memory exhaustion by capping the total number of unwritten frames.

## Benchmark Configuration
- **Composition URL**: Standard simple-animation HTML fixture
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), codec libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.7s
- **Bottleneck analysis**: Waiting for `activePromise` in Node.js blocks subsequent CDP commands from entering Chromium's queue, leaving the renderer process and IPC pipes idle.

## Implementation Spec

### Step 1: Remove `activePromise` await in `captureWorkerFrame`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside the `captureWorkerFrame` async function, remove the `try { await activePromise; } catch (e) { /* ignore */ }` block entirely.
Optionally, remove the `activePromise` argument from the `captureWorkerFrame` function signature and its call site.
**Why**: Allows Node.js to push multiple `setTime` and `beginFrame` commands to Chromium concurrently without Node-side serialization overhead.
**Risk**: Exposing unhandled promise rejections if the IPC fails unexpectedly, though `onWriteError` will catch stream-level errors.

## Correctness Check
Run the DOM verification scripts to ensure frames are still sequenced correctly:
`npx vitest packages/renderer/tests/verify-cdp-driver.ts`

## Canvas Smoke Test
Run `npx vitest packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.
