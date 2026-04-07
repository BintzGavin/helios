---
id: PERF-206
slug: remove-active-promise-await
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---
# PERF-206: Remove Worker IPC Serialization

## Focus Area
The hot frame capture loop in `packages/renderer/src/Renderer.ts`. Specifically, eliminating the `await activePromise;` bottleneck inside the `captureWorkerFrame` function.

## Background Research
Currently, the `captureLoop` limits in-flight frames using a sliding window. However, inside `captureWorkerFrame`, the code explicitly awaits the `activePromise` (the previous frame's capture promise) before dispatching the `setTime` and `beginFrame` CDP commands for the next frame. This serializes CDP commands in Node.js, forcing the Node-Chromium IPC pipe to go idle. By removing `await activePromise;`, Node.js will immediately dispatch the next frame's CDP commands to Chromium's queue while Chromium is still processing the previous frame. This keeps the IPC pipes saturated and significantly reduces latency.

## Baseline
- **Current estimated render time**: 33.7s
- **Bottleneck analysis**: Waiting for `activePromise` in Node.js blocks subsequent CDP commands from entering Chromium's queue, leaving the renderer process and IPC pipes idle during round-trip latency.

## Implementation Spec

### Step 1: Remove the await on `activePromise` inside the `captureWorkerFrame` function
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Inside the `captureWorkerFrame` async function, remove the explicit `await` on `activePromise` (the previous frame's capture promise).
**Why**: Allows Node.js to pipeline CDP commands directly to Chromium concurrently, avoiding Node-side serialization overhead.
**Risk**: Exposing unhandled promise rejections if the IPC fails unexpectedly.

## Correctness Check
Run the DOM verification scripts to ensure frames are still sequenced correctly: `npx tsx packages/renderer/tests/verify-cdp-driver.ts`
