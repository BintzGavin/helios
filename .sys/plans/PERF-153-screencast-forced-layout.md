---
id: PERF-153
slug: screencast-forced-layout
status: unclaimed
claimed_by: ""
created: 2024-04-02
completed: ""
result: ""
---
# PERF-153: Screencast with Forced Layout Damage

## Focus Area
DOM Frame Capture Pipeline (specifically replacing `HeadlessExperimental.beginFrame` and `Page.captureScreenshot` with `Page.startScreencast`).

## Background Research
`Page.startScreencast` avoids the massive round-trip IPC overhead of requesting a screenshot frame-by-frame, instead pushing frames continuously from the browser. Previous experiments (PERF-026) failed because screencast is damage-driven — if a frame has no visual changes (no damage), Chromium skips emitting the screencast frame, causing deadlocks or missing frames in our pipeline. By injecting a forced, invisible DOM mutation on every `setTime` tick, we can trick the compositor into registering layout damage for every frame. This guarantees a screencast emission for every virtual time tick, giving us the IPC-free speed of screencast with the frame-perfect reliability of `captureScreenshot`.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.4s
- **Bottleneck analysis**: The IPC overhead of sending `HeadlessExperimental.beginFrame` and receiving massive Base64 strings for every single frame is the largest remaining CPU bottleneck in the hot loop.

## Implementation Spec

### Step 1: Implement `ScreencastDomStrategy`
**File**: `packages/renderer/src/strategies/ScreencastDomStrategy.ts`
**What to change**: Create a new class implementing `RenderStrategy`. In `prepare()`, initiate `cdpSession.send('Page.startScreencast', { format: 'jpeg', quality: 100 })` and attach a listener to `Page.screencastFrame` that buffers incoming base64 strings into an array/queue and immediately sends `Page.screencastFrameAck`.
**Why**: This sets up the push-based capture pipeline.
**Risk**: Memory limits if the screencast queue grows faster than FFmpeg can consume it.

### Step 2: Inject Forced Layout Damage
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Inside the `setTime` function, alongside advancing the animation time, execute a tiny DOM mutation that forces layout recalculation (e.g., toggling a 1x1 transparent div's opacity or `transform: translateZ(0)`).
**Why**: Guarantees the Chromium compositor sees visual damage and emits a screencast frame.
**Risk**: The mutation itself might introduce rendering artifacts or slight overhead.

### Step 3: Await Screencast Frame in Hot Loop
**File**: `packages/renderer/src/strategies/ScreencastDomStrategy.ts`
**What to change**: Implement `capture()` to simply pop the next available frame from the screencast buffer (yielding a Promise if the buffer is temporarily empty until the next `Page.screencastFrame` event fires).
**Why**: Replaces the expensive synchronous `beginFrame` capture with a fast buffer pop.

### Step 4: Wire up the Strategy
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Conditionally instantiate `ScreencastDomStrategy` if a specific flag is set, or replace `DomStrategy` for the purpose of the experiment.
**Why**: Integrates the new capture mechanism into the main render pipeline.

## Variations
### Variation A: Toggle CSS Variable
Instead of a DOM node mutation, toggle a root CSS custom property that forces a layout recalculation without needing DOM traversal.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure `CanvasStrategy` is completely unaffected.

## Correctness Check
Review the output video to verify no duplicate frames or dropped animations.

## Prior Art
- PERF-026: Failed screencast attempt (dropped frames due to lack of damage).
- PERF-032: Open question in the RENDERER-EXPERIMENTS.md journal regarding this exact forced layout approach.
