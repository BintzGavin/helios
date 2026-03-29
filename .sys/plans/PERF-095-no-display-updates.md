---
id: PERF-095
slug: no-display-updates
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-095: noDisplayUpdates

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop in `DomStrategy.ts`.

## Background Research
The `HeadlessExperimental.beginFrame` CDP command accepts a `noDisplayUpdates` parameter. When set to `true`, the browser may avoid updating the display for the frame, while still producing a screenshot if requested. In a headless environment, since we're only interested in capturing screenshots and not actually displaying them to a user, setting this flag might bypass unnecessary display-related operations in the Chromium compositor, potentially reducing CPU overhead per frame and improving overall rendering speed.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/examples/simple-animation
- **Render Settings**: 1920x1080, 60fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.376s
- **Bottleneck analysis**: The Frame Capture Loop (`HeadlessExperimental.beginFrame`) is the primary bottleneck. Any reduction in the work done by the Chromium compositor per frame will directly improve overall render time.

## Implementation Spec

### Step 1: Add noDisplayUpdates to beginFrameParams
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: Update the `beginFrameParams` and `beginFrameTargetParams` initialization around line 145 to include `noDisplayUpdates: true`.

```typescript
    this.cdpScreenshotParams = cdpScreenshotParams;
    this.beginFrameParams = { screenshot: this.cdpScreenshotParams, noDisplayUpdates: true };
    this.beginFrameTargetParams = { screenshot: { ...this.cdpScreenshotParams, clip: { x: 0, y: 0, width: 0, height: 0, scale: 1 } }, noDisplayUpdates: true };
```

**Why**: By instructing the compositor to skip display updates, we might save CPU cycles that are otherwise spent on unnecessary rendering pipeline stages that don't contribute to the generated screenshot.
**Risk**: Chromium might ignore the `noDisplayUpdates` flag when a `screenshot` is requested, or it might cause the screenshot to be blank/omitted if the compositor optimization is too aggressive. We need to verify the correctness of the generated frames.

## Canvas Smoke Test
Run a basic canvas render to ensure `DomStrategy.ts` modifications haven't inadvertently broken anything shared, though this change is specific to the DOM strategy.

## Correctness Check
Verify that the output video contains the correct frames and is not a black/blank video or missing animations. `noDisplayUpdates` shouldn't prevent screenshot generation, but it's crucial to confirm.

## Prior Art
- Chromium CDP documentation for `HeadlessExperimental.beginFrame` mentions the `noDisplayUpdates` parameter.
