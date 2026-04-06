---
id: PERF-199
slug: eliminate-seek-ipc
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2024-05-30"
result: "discarded"
---

# PERF-199: Eliminate SeekTimeDriver IPC Overhead

## Focus Area
The Node.js <-> Playwright (Browser) IPC hot loop in `Renderer.ts` and `SeekTimeDriver.ts`.

## Background Research
Currently, the DOM renderer hot loop executes two CDP commands per frame: `Runtime.evaluate` (to advance time via `window.__helios_seek`) and `HeadlessExperimental.beginFrame` (to trigger the render and capture the pixels). Each CDP command incurs IPC serialization, WebSocket transmission, and Playwright event emitter overhead in Node.js.
Because `HeadlessExperimental.beginFrame` intrinsically triggers a `requestAnimationFrame` loop in the browser, we can move the `__helios_seek` call directly into a native `requestAnimationFrame` callback. This auto-advances the composition time inside the browser precisely when `beginFrame` fires, eliminating the need for Node.js to explicitly send `Runtime.evaluate` on every single frame. This halves the IPC traffic and V8 queue pressure during the capture loop.

## Benchmark Configuration
- **Composition URL**: `examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5s duration (150 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 33.331s
- **Bottleneck analysis**: IPC latency and JSON serialization overhead of dispatching `Runtime.evaluate` continuously over the CDP websocket during the `captureWorkerFrame` loop.

## Implementation Spec

### Step 1: Inject auto-advance rAF hook
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Inside the `prepare()` initialization script, register a `requestAnimationFrame` loop that automatically calculates the expected virtual time based on a frame counter (incremented each tick) and the FPS. In this hook, call `window.__helios_seek` synchronously before yielding. Ensure the frame interval is passed in from Node or calculated dynamically.
**Why**: `beginFrame` inherently calls rAF callbacks before layout. By hooking rAF, the DOM seeks itself natively in C++ before the screenshot is taken.
**Risk**: If a composition has media elements that wait on promises during seek, making it synchronous inside rAF might bypass the wait, capturing frames before they are visually ready.

### Step 2: Disable setTime IPC execution
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Modify `setTime()` so that it immediately returns `Promise.resolve()` instead of sending `Runtime.evaluate`, completely removing the IPC call from the Node.js loop.
**Why**: The DOM state is now managed autonomously by the browser receiving the `beginFrame` signal.
**Risk**: If frames drop, the browser's rAF counter might desync from Node's expected frame.

## Variations

### Variation A: Runtime.callFunctionOn
Instead of eliminating IPC entirely, replace `Runtime.evaluate` with `Runtime.callFunctionOn` to execute the seek function by objectId or global window reference, passing arguments dynamically. This maintains strict Node.js synchronization but eliminates string parsing overhead in V8.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to verify Canvas mode remains functional since it shares no `SeekTimeDriver` dependencies.

## Correctness Check
Run the standard benchmark and manually inspect the output mp4 to ensure the animation progresses smoothly and doesn't freeze or skip frames.

## Prior Art
- PERF-194 (Preallocate evaluate objects) targeted this exact same bottleneck.
- PERF-184 (Replace startScreencast with beginFrame) established synchronous DOM frame captures.

## Results Summary
- **Best render time**: 35.091s (vs baseline 33.331s)
- **Improvement**: -5.2%
- **Kept experiments**: []
- **Discarded experiments**: [Eliminate SeekTimeDriver IPC via rAF synchronous evaluate hook]
