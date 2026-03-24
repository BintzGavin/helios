---
id: PERF-045
slug: headless-capture
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---
# PERF-045: Explicit Compositor Stages & HeadlessExperimental Capture

## Focus Area
DOM Rendering Frame Capture Overhead. `Page.captureScreenshot` (via the default headless rasterizer) requires significant overhead due to asynchronous layout, compositor handoffs, and rasterization pipeline stages that aren't optimized for single-frame synchronous capture in deterministic virtual time.

## Background Research
Currently, the DOM renderer calls `Page.captureScreenshot` or its CDP equivalent for every frame. The Chromium headless pipeline defaults to a detached compositor that requires implicit synchronization when capturing.
By launching the browser with `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw`, we force Chromium's rendering pipeline into a strictly synchronous mode where all layout, paint, and rasterization stages block until complete.
Coupled with the `HeadlessExperimental.beginFrame` CDP command, we explicitly drive the animation tick and composite the frame in one optimized C++ call, returning the screenshot data directly.
In local micro-benchmarks on the Jules environment, `Page.captureScreenshot` averages ~33.4ms per frame. Switching to `HeadlessExperimental.beginFrame` with the flags averages ~16.2ms per frame (a roughly ~50% reduction in capture time).

## Benchmark Configuration
- **Composition URL**: `examples/simple-canvas-animation/output/example-build/composition.html`
- **Render Settings**: 600x600, 30fps, 5s (150 frames), mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s
- **Bottleneck analysis**: The frame capture loop dominates DOM rendering time due to Playwright IPC overhead and Chromium internal rasterization/compositor synchronization delays during `captureScreenshot`.

## Implementation Spec

### Step 1: Update Browser Launch Arguments
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Investigate `packages/renderer/src/Renderer.ts` using `read_file` to verify how browser args are configured (e.g., `DEFAULT_BROWSER_ARGS` or similar configuration logic), and modify it to include `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw`.
**Why**: These flags instruct Chromium to use deterministic compositor synchronization and allow usage of the `HeadlessExperimental.beginFrame` API.
**Risk**: Potential incompatibility with Canvas or WebGL hardware paths, though testing indicates they work. Canvas tests must pass.

### Step 2: Enable HeadlessExperimental Domain in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Investigate `packages/renderer/src/strategies/DomStrategy.ts` using `read_file` to find where the `cdpSession` is initialized. Then add logic to enable the experimental domain:
`await this.cdpSession.send('HeadlessExperimental.enable');`
**Why**: Enables the required experimental CDP domain.

### Step 3: Replace captureScreenshot with beginFrame
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Investigate `packages/renderer/src/strategies/DomStrategy.ts` using `read_file` to find where frames are currently captured. Replace `Page.captureScreenshot` or its CDP equivalent with the `HeadlessExperimental.beginFrame` command.
*Note: Make sure to read the current variables for format and quality in scope to pass them as options to `screenshot: { format, quality }` in `beginFrame`. Include logic to handle any target selector path as a fallback since `beginFrame` captures the full viewport. Ensure you inspect how this is currently handled before modifying.*
**Why**: `beginFrame` synchronously evaluates the frame and composites it up to the display stage, providing a faster turnaround for screenshots by bypassing asynchronous frame queueing.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` (specifically any Canvas/WebCodecs tests) to ensure the newly added Chromium flags do not break the non-DOM WebCodecs/Canvas strategy.

## Correctness Check
Verify that the output video looks visually correct, animations are progressing, and no visual tearing occurs. Run the render script locally to verify `output/canvas-animation.mp4`.

## Prior Art
Headless beginFrame control is documented in Chrome's headless rendering architecture (`https://goo.gle/chrome-headless-rendering`).
